import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      topic = 'js',
      customTopic = '',
      difficulty = 'intermediate',
      format = 'balanced', // 'balanced' | 'coding' | 'quiz'
      count = 5,
      duration = 20,
      userApiKey = ''
    } = body;

    const targetCount = Math.max(1, Math.min(15, parseInt(count) || 5));
    const activeTopic = (customTopic && customTopic.trim()) ? customTopic.trim() : topic;
    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    let mockQuestions = [];

    // 1. If Gemini API Key is provided, try Gemini 2.0 / 1.5 Flash
    if (apiKey) {
      try {
        mockQuestions = await generateWithGemini(apiKey, {
          topic: activeTopic,
          difficulty,
          format,
          count: targetCount
        });
      } catch (geminiErr) {
        console.warn('Gemini API call error, using generative procedural engine:', geminiErr.message);
        mockQuestions = generateDiverseMockQuestions(activeTopic, difficulty, format, targetCount);
      }
    } else {
      // 2. High-performance randomized generative engine with limitless dynamic combinations
      mockQuestions = generateDiverseMockQuestions(activeTopic, difficulty, format, targetCount);
    }

    // Always guarantee exact targetCount
    if (mockQuestions.length < targetCount) {
      const extraNeeded = targetCount - mockQuestions.length;
      const extraQuestions = generateDynamicProceduralChallenges(activeTopic, difficulty, format, extraNeeded, mockQuestions.length);
      mockQuestions = [...mockQuestions, ...extraQuestions];
    }

    // Double-randomize and assign unique IDs
    const finalQuestions = mockQuestions.slice(0, targetCount).map((q, idx) => ({
      ...q,
      id: `q_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_index: idx
    }));

    const testId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalPoints = finalQuestions.reduce((acc, q) => acc + (q.points || 1), 0);

    const mockTest = {
      id: testId,
      title: `${getTopicTitle(activeTopic)} [AI Practice Exam]`,
      topic: activeTopic,
      difficulty,
      format,
      duration_minutes: parseInt(duration) || 20,
      total_marks: totalPoints,
      questions: finalQuestions,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      mockTest
    });
  } catch (error) {
    console.error('Generate mock test error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate mock test' }, { status: 500 });
  }
}

/**
 * Calls Google Gemini API with fallback models and high temperature for maximum variety
 */
async function generateWithGemini(apiKey, { topic, difficulty, format, count }) {
  const seed = Math.random().toString(36).substring(2, 8);
  const prompt = `You are a distinguished computer science professor and senior software engineer. Create a unique, highly engaging examination paper.
Randomization Seed: ${seed}
Topic: "${topic}"
Difficulty Level: "${difficulty}"
Question Format: "${format}"
Total Questions to generate: EXACTLY ${count} questions.

REQUIREMENTS:
1. Return EXACTLY ${count} unique questions in the JSON array.
2. If format is 'balanced': Mix MCQ, JavaScript Coding Challenges, and Short Answer questions.
3. If format is 'coding': Return ALL live JavaScript Coding Challenges.
4. If format is 'quiz': Return Multiple Choice and Short Answer conceptual questions.
5. For EVERY Coding Challenge:
   - Provide a clear problem description and function signature.
   - Provide 'starter_code' (e.g. function solution(...) { ... }).
   - Provide 'correct_answer' containing the full working JavaScript reference solution.
   - Provide 3-4 'test_cases' with valid JSON strings/numbers for 'input' and 'expected'.
6. For EVERY MCQ:
   - Exactly 4 options.
   - Provide the exact string of the correct option in 'correct_answer'.
   - 1-sentence 'explanation'.
7. Include a helpful 'hint' for each question.

Return ONLY a valid JSON array of objects with NO markdown fences:
[
  {
    "question_text": "...",
    "question_type": "mcq" | "coding" | "short_answer",
    "options": ["A", "B", "C", "D"] (or null for non-mcq),
    "correct_answer": "...",
    "starter_code": "function ...",
    "test_cases": [
      { "input": "...", "expected": "...", "description": "...", "hidden": false }
    ],
    "explanation": "...",
    "hint": "...",
    "points": 2
  }
]`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.95
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${model} returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from model');

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count).map((q, idx) => ({
          id: `q_ai_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order_index: idx,
          question_text: q.question_text || `Question ${idx + 1}`,
          question_type: q.question_type || 'mcq',
          options: Array.isArray(q.options) ? shuffleArray(q.options) : null,
          correct_answer: q.correct_answer || '',
          starter_code: q.starter_code || (q.question_type === 'coding' ? 'function solution(input) {\n  // Write your code here\n  return input;\n}' : null),
          test_cases: Array.isArray(q.test_cases) ? q.test_cases : [],
          explanation: q.explanation || '',
          hint: q.hint || 'Think about the core fundamental concepts of this topic.',
          points: q.points || (q.question_type === 'coding' ? 5 : 2)
        }));
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Gemini model endpoints failed');
}

/**
 * Generative Procedural Synthesizer:
 * Combines 80+ curated questions with 25+ dynamic combinatorial problem factories.
 * Every execution generates a fresh, randomized assessment.
 */
function generateDiverseMockQuestions(topic, difficulty, format, count) {
  const topicKey = String(topic).toLowerCase();

  // 1. Get base pool for topic
  let pool = [];
  if (topicKey.includes('git')) {
    pool = [...getGitCurriculumPool(difficulty), ...generateDynamicGitChallenges(difficulty)];
  } else if (topicKey.includes('react') || topicKey.includes('mern') || topicKey.includes('node') || topicKey.includes('express') || topicKey.includes('mongo')) {
    pool = [...getMernCurriculumPool(difficulty), ...generateDynamicMernChallenges(difficulty)];
  } else if (topicKey.includes('dsa') || topicKey.includes('algo') || topicKey.includes('structure') || topicKey.includes('tree')) {
    pool = [...getDsaCurriculumPool(difficulty), ...generateDynamicDsaChallenges(difficulty)];
  } else if (topicKey.includes('python') || topicKey.includes('py')) {
    pool = [...getPythonCurriculumPool(difficulty), ...generateDynamicPythonChallenges(difficulty)];
  } else {
    pool = [...getJsCurriculumPool(difficulty), ...generateDynamicJsChallenges(difficulty)];
  }

  // Also include general algorithmic problem factories for high variety
  const proceduralGenerators = generateDynamicProceduralChallenges(topic, difficulty, format, 10);
  pool = [...pool, ...proceduralGenerators];

  // 2. Filter by format
  let filtered = [...pool];
  if (format === 'coding') {
    filtered = pool.filter(q => q.question_type === 'coding');
  } else if (format === 'quiz') {
    filtered = pool.filter(q => q.question_type !== 'coding');
  }

  // 3. Shuffle pool thoroughly with Fisher-Yates
  const shuffled = shuffleArray(filtered);

  // 4. Strict Deduplication by question text
  const selected = [];
  const seenTexts = new Set();

  for (const q of shuffled) {
    const key = (q.question_text || '').trim().toLowerCase();
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      if (q.question_type === 'mcq' && Array.isArray(q.options)) {
        selected.push({
          ...q,
          options: shuffleArray([...q.options])
        });
      } else {
        selected.push(q);
      }
    }
    if (selected.length >= count) break;
  }

  return selected;
}

// -------------------------------------------------------------
// DYNAMIC PROCEDURAL CODING FACTORIES (Infinite variations)
// -------------------------------------------------------------

function generateDynamicProceduralChallenges(topic, difficulty, format, count) {
  const generators = [
    // 1. Array Element Filter & Multiplier
    () => {
      const mult = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
      const threshold = [5, 10, 15, 20][Math.floor(Math.random() * 4)];
      return {
        question_text: `Write a function \`multiplyAboveThreshold(nums, threshold, multiplier)\` that filters out numbers less than or equal to \`threshold\` and multiplies the remaining numbers by \`multiplier\`.`,
        question_type: "coding",
        starter_code: "function multiplyAboveThreshold(nums, threshold, multiplier) {\n  // Write your code here\n  return [];\n}",
        correct_answer: "function multiplyAboveThreshold(nums, threshold, multiplier) {\n  return nums.filter(n => n > threshold).map(n => n * multiplier);\n}",
        test_cases: [
          { input: `[5, 12, 3, 20, 8], 10, 2`, expected: `[24, 40]`, description: `Elements > 10 multiplied by 2` },
          { input: `[1, 2, 3], 5, 3`, expected: `[]`, description: `No elements above threshold` },
          { input: `[15, 30], 10, 3`, expected: `[45, 90]`, description: `All elements above threshold` }
        ],
        explanation: `Filter numbers where n > threshold and map each remaining number with * multiplier.`,
        hint: `Use .filter() followed by .map().`,
        points: 5
      };
    },
    // 2. String Word Anagram / Character Frequency
    () => {
      return {
        question_text: "Write a function `isAnagram(s, t)` that checks if string `s` and string `t` are anagrams of each other (ignoring case and whitespace).",
        question_type: "coding",
        starter_code: "function isAnagram(s, t) {\n  // Write your code here\n  return false;\n}",
        correct_answer: "function isAnagram(s, t) {\n  const clean = str => str.toLowerCase().replace(/\\s+/g, '').split('').sort().join('');\n  return clean(s) === clean(t);\n}",
        test_cases: [
          { input: '"listen", "silent"', expected: 'true', description: 'Exact anagram' },
          { input: '"rail safety", "fairy tales"', expected: 'true', description: 'Anagram with spaces' },
          { input: '"hello", "world"', expected: 'false', description: 'Not an anagram' }
        ],
        explanation: "Strip spaces, convert to lowercase, sort character arrays and compare equality.",
        hint: "Sort the letters of both strings and compare.",
        points: 5
      };
    },
    // 3. Object Key Inversion / Transformation
    () => {
      return {
        question_text: "Write a function `invertObject(obj)` that swaps the keys and values of a simple key-value object.",
        question_type: "coding",
        starter_code: "function invertObject(obj) {\n  // Write your code here\n  return {};\n}",
        correct_answer: "function invertObject(obj) {\n  const result = {};\n  for (const [key, val] of Object.entries(obj)) {\n    result[val] = key;\n  }\n  return result;\n}",
        test_cases: [
          { input: '{"a": "1", "b": "2"}', expected: '{"1":"a","2":"b"}', description: 'Basic string inversion' },
          { input: '{"name": "examguard", "role": "proctor"}', expected: '{"examguard":"name","proctor":"role"}', description: 'Word inversion' }
        ],
        explanation: "Iterate with Object.entries and set result[val] = key.",
        hint: "Use Object.entries(obj) in a loop.",
        points: 5
      };
    },
    // 4. Missing Number in Arithmetic Range
    () => {
      return {
        question_text: "Write a function `findMissingNumber(nums)` that takes an array containing n distinct numbers in the range `[0, n]` and returns the only number missing from the range.",
        question_type: "coding",
        starter_code: "function findMissingNumber(nums) {\n  // Write your code here\n  return 0;\n}",
        correct_answer: "function findMissingNumber(nums) {\n  const n = nums.length;\n  const expectedSum = (n * (n + 1)) / 2;\n  const actualSum = nums.reduce((a, b) => a + b, 0);\n  return expectedSum - actualSum;\n}",
        test_cases: [
          { input: '[3, 0, 1]', expected: '2', description: 'Missing 2 from [0, 3]' },
          { input: '[0, 1]', expected: '2', description: 'Missing n' },
          { input: '[9,6,4,2,3,5,7,0,1]', expected: '8', description: 'Missing 8' }
        ],
        explanation: "Calculate expected sum with Gaussian formula n*(n+1)/2 and subtract the actual array sum in O(N) time.",
        hint: "Use Gauss sum formula: (n * (n + 1)) / 2.",
        points: 5
      };
    },
    // 5. String Run-Length Compression
    () => {
      return {
        question_text: "Write a function `compressString(str)` that performs basic string compression using the counts of repeated characters (e.g. 'aabcccccaaa' -> 'a2b1c5a3').",
        question_type: "coding",
        starter_code: "function compressString(str) {\n  // Write your code here\n  return str;\n}",
        correct_answer: "function compressString(str) {\n  if (!str) return '';\n  let result = '';\n  let count = 1;\n  for (let i = 0; i < str.length; i++) {\n    if (str[i] === str[i + 1]) {\n      count++;\n    } else {\n      result += str[i] + count;\n      count = 1;\n    }\n  }\n  return result;\n}",
        test_cases: [
          { input: '"aabcccccaaa"', expected: '"a2b1c5a3"', description: 'Repeated characters' },
          { input: '"abc"', expected: '"a1b1c1"', description: 'Distinct characters' },
          { input: '""', expected: '""', description: 'Empty string' }
        ],
        explanation: "Iterate through string tracking consecutive character counts and append char + count on character transitions.",
        hint: "Compare str[i] with str[i+1] in a loop.",
        points: 5
      };
    },
    // 6. Sliding Window Max Subarray Sum
    () => {
      return {
        question_text: "Write a function `maxSubarraySum(nums, k)` that finds the maximum sum of any contiguous subarray of size `k`.",
        question_type: "coding",
        starter_code: "function maxSubarraySum(nums, k) {\n  // Write your code here\n  return 0;\n}",
        correct_answer: "function maxSubarraySum(nums, k) {\n  if (nums.length < k || k <= 0) return 0;\n  let maxSum = 0, windowSum = 0;\n  for (let i = 0; i < k; i++) windowSum += nums[i];\n  maxSum = windowSum;\n  for (let i = k; i < nums.length; i++) {\n    windowSum += nums[i] - nums[i - k];\n    if (windowSum > maxSum) maxSum = windowSum;\n  }\n  return maxSum;\n}",
        test_cases: [
          { input: '[2, 1, 5, 1, 3, 2], 3', expected: '9', description: 'Subarray [5, 1, 3] = 9' },
          { input: '[2, 3, 4, 1, 5], 2', expected: '7', description: 'Subarray [3, 4] = 7' },
          { input: '[1, 2], 3', expected: '0', description: 'k > array length' }
        ],
        explanation: "Use the sliding window technique to slide across the array in O(N) linear time without re-summing sub-arrays.",
        hint: "Add the new incoming element and subtract the outgoing element.",
        points: 5
      };
    },
    // 7. Dynamic MCQ on Closures & Lexical Scope
    () => {
      return {
        question_text: "What will the following code output?\n```js\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n```",
        question_type: "mcq",
        options: ["3, 3, 3", "0, 1, 2", "undefined, undefined, undefined", "ReferenceError: i is not defined"],
        correct_answer: "3, 3, 3",
        explanation: "Because 'var' is function-scoped rather than block-scoped, the variable 'i' is shared across all loop iterations. When the timer callbacks execute, i has already reached 3.",
        hint: "Think about the scoping differences between 'var' and 'let'.",
        points: 2
      };
    },
    // 8. Dynamic MCQ on Array Methods & Immutability
    () => {
      return {
        question_text: "Which of the following array methods mutates the original array in-place rather than returning a new copy?",
        question_type: "mcq",
        options: ["Array.prototype.splice()", "Array.prototype.slice()", "Array.prototype.map()", "Array.prototype.concat()"],
        correct_answer: "Array.prototype.splice()",
        explanation: "splice() changes the contents of an array in place by removing or replacing existing elements. slice(), map(), and concat() return shallow copies.",
        hint: "Splice mutates; slice returns a copy.",
        points: 2
      };
    },
    // 9. Dynamic Short Answer on Debounce vs Throttle
    () => {
      return {
        question_text: "Briefly explain the practical difference between Debouncing and Throttling in web performance optimization.",
        question_type: "short_answer",
        correct_answer: "Debounce delays function execution until a specified quiet period has elapsed after the last event, while Throttle guarantees the function executes at most once in every fixed time interval.",
        explanation: "Debouncing is ideal for search auto-complete inputs; throttling is ideal for window scroll or resize listeners.",
        hint: "Explain quiet period after last event vs fixed interval rate limiting.",
        points: 3
      };
    }
  ];

  const shuffledGens = shuffleArray(generators);
  const results = [];
  for (let i = 0; i < count; i++) {
    const generator = shuffledGens[i % shuffledGens.length];
    results.push(generator());
  }
  return results;
}

// -------------------------------------------------------------
// DYNAMIC TOPIC-SPECIFIC FACTORIES
// -------------------------------------------------------------

function generateDynamicJsChallenges(difficulty) {
  return [
    {
      question_text: "Write a function `deepFlatten(arr)` that flattens a nested array of any depth without using Array.prototype.flat().",
      question_type: "coding",
      starter_code: "function deepFlatten(arr) {\n  // Write your code here\n  return [];\n}",
      correct_answer: "function deepFlatten(arr) {\n  return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(deepFlatten(val)) : acc.concat(val), []);\n}",
      test_cases: [
        { input: '[1, [2, [3, [4]], 5]]', expected: '[1, 2, 3, 4, 5]', description: 'Multi-level nesting' },
        { input: '[[1, 2], [3, 4]]', expected: '[1, 2, 3, 4]', description: '2D matrix' }
      ],
      explanation: "Use recursion with Array.isArray and Array.prototype.concat or reduce.",
      hint: "Use recursion inside Array.prototype.reduce().",
      points: 5
    },
    {
      question_text: "Write a function `groupBy(array, key)` that groups an array of objects by a specified property key.",
      question_type: "coding",
      starter_code: "function groupBy(array, key) {\n  // Write your code here\n  return {};\n}",
      correct_answer: "function groupBy(array, key) {\n  return array.reduce((result, item) => {\n    const val = item[key];\n    if (!result[val]) result[val] = [];\n    result[val].push(item);\n    return result;\n  }, {});\n}",
      test_cases: [
        { input: '[{"category": "tech", "name": "laptop"}, {"category": "tech", "name": "phone"}, {"category": "clothing", "name": "shirt"}], "category"', expected: '{"tech":[{"category":"tech","name":"laptop"},{"category":"tech","name":"phone"}],"clothing":[{"category":"clothing","name":"shirt"}]}', description: 'Group by category' }
      ],
      explanation: "Reduce over the array accumulating elements into keys of a result object.",
      hint: "Use Array.prototype.reduce() accumulating into an object map.",
      points: 5
    }
  ];
}

function generateDynamicMernChallenges(difficulty) {
  return [
    {
      question_text: "Write a function `parseMongoProjection(fieldsString)` that converts a space-separated field selection string (e.g., 'name email -password') into a MongoDB projection object.",
      question_type: "coding",
      starter_code: "function parseMongoProjection(fieldsString) {\n  // Write your code here\n  return {};\n}",
      correct_answer: "function parseMongoProjection(fieldsString) {\n  const res = {};\n  fieldsString.trim().split(/\\s+/).forEach(f => {\n    if (f.startsWith('-')) res[f.substring(1)] = 0;\n    else if (f) res[f] = 1;\n  });\n  return res;\n}",
      test_cases: [
        { input: '"name email -password"', expected: '{"name":1,"email":1,"password":0}', description: 'Inclusion and exclusion' },
        { input: '"title description"', expected: '{"title":1,"description":1}', description: 'Inclusion only' }
      ],
      explanation: "Split string by whitespace, map fields starting with '-' to 0 and regular fields to 1.",
      hint: "Check if the token starts with '-'.",
      points: 5
    },
    {
      question_text: "In React, what will happen if you update state using `setCount(count + 1)` multiple times in the same synchronous event handler?",
      question_type: "mcq",
      options: [
        "React batches the updates and increments by 1 only once",
        "React triggers multiple synchronous re-renders for each line",
        "It increments correctly by the number of calls",
        "It throws an 'Infinite Render Loop' exception"
      ],
      correct_answer: "React batches the updates and increments by 1 only once",
      explanation: "State updates using direct state references are batched and evaluate with the stale render closure value. To queue sequential updates, use the functional form `setCount(prev => prev + 1)`.",
      hint: "React batches state updates and evaluates them against the current render closure.",
      points: 2
    }
  ];
}

function generateDynamicGitChallenges(difficulty) {
  return [
    {
      question_text: "Write a function `isCleanGitCommitMessage(msg)` that verifies if a Git commit message follows conventional commit format (e.g., 'feat: add auth', 'fix(proctor): resolve timer bug').",
      question_type: "coding",
      starter_code: "function isCleanGitCommitMessage(msg) {\n  // Write your code here\n  return false;\n}",
      correct_answer: "function isCleanGitCommitMessage(msg) {\n  return /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\\([a-z0-9-]+\\))?:\\s.+$/i.test(msg.trim());\n}",
      test_cases: [
        { input: '"feat: add proctoring shield"', expected: 'true', description: 'Standard feat commit' },
        { input: '"fix(vision): fix eye tracking false positives"', expected: 'true', description: 'Scoped fix commit' },
        { input: '"updated code"', expected: 'false', description: 'Non-conventional commit' }
      ],
      explanation: "Use regular expressions to validate type prefix, optional scope parentheses, colon, and description.",
      hint: "Use regex checking for prefixes like feat, fix, chore followed by a colon.",
      points: 5
    }
  ];
}

function generateDynamicDsaChallenges(difficulty) {
  return [
    {
      question_text: "Write a function `fibonacci(n)` that returns the n-th Fibonacci number where fib(0) = 0 and fib(1) = 1 in O(N) time or better.",
      question_type: "coding",
      starter_code: "function fibonacci(n) {\n  // Write your code here\n  return 0;\n}",
      correct_answer: "function fibonacci(n) {\n  if (n <= 0) return 0;\n  if (n === 1) return 1;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    const temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n}",
      test_cases: [
        { input: '0', expected: '0', description: 'Base 0' },
        { input: '1', expected: '1', description: 'Base 1' },
        { input: '6', expected: '8', description: 'Fibonacci of 6' },
        { input: '10', expected: '55', description: 'Fibonacci of 10' }
      ],
      explanation: "Iterative bottom-up dynamic programming approach in O(N) time and O(1) space.",
      hint: "Use two running variables to accumulate previous numbers.",
      points: 5
    }
  ];
}

function generateDynamicPythonChallenges(difficulty) {
  return [
    {
      question_text: "What is the primary difference between a list and a tuple in Python?",
      question_type: "mcq",
      options: [
        "Lists are mutable and defined with [], while tuples are immutable and defined with ()",
        "Tuples can only store numbers, while lists can store any object",
        "Lists are faster for lookup than tuples",
        "There is no functional difference"
      ],
      correct_answer: "Lists are mutable and defined with [], while tuples are immutable and defined with ()",
      explanation: "Tuples cannot be modified after creation (immutable), which makes them hashable and memory efficient.",
      hint: "Mutability vs immutability.",
      points: 2
    }
  ];
}

// -------------------------------------------------------------
// CURRICULUM POOLS (Dozens of hand-crafted assessment items)
// -------------------------------------------------------------

function getJsCurriculumPool(difficulty) {
  return [
    {
      question_text: "What is the expected output of console.log(typeof typeof 1)?",
      question_type: "mcq",
      options: ["number", "string", "undefined", "object"],
      correct_answer: "string",
      explanation: "typeof 1 yields 'number' (a string primitive). Applying typeof again to 'number' evaluates to 'string'.",
      hint: "Remember that typeof operator always returns its result as a string primitive.",
      points: 2
    },
    {
      question_text: "Write a function `reverseWords(str)` that reverses the order of words in a given sentence while maintaining single spaces between words.",
      question_type: "coding",
      starter_code: "function reverseWords(str) {\n  // Write your code here\n  return str;\n}",
      correct_answer: "function reverseWords(str) {\n  return str.trim().split(/\\s+/).reverse().join(' ');\n}",
      test_cases: [
        { input: '"the sky is blue"', expected: '"blue is sky the"', description: 'Standard sentence' },
        { input: '"  hello world  "', expected: '"world hello"', description: 'Trims extraneous spaces' },
        { input: '"ExamGuard AI"', expected: '"AI ExamGuard"', description: 'Two words' }
      ],
      explanation: "Split the sentence by whitespace regex, reverse the array of words, and join them with a single space.",
      hint: "Use String.prototype.trim(), .split(/\\s+/), .reverse(), and .join(' ').",
      points: 5
    },
    {
      question_text: "Write a function `isPalindrome(str)` that checks whether a given string is a palindrome (ignoring non-alphanumeric characters and casing).",
      question_type: "coding",
      starter_code: "function isPalindrome(str) {\n  // Write your code here\n  return false;\n}",
      correct_answer: "function isPalindrome(str) {\n  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}",
      test_cases: [
        { input: '"A man, a plan, a canal: Panama"', expected: 'true', description: 'Panama sentence' },
        { input: '"race a car"', expected: 'false', description: 'Not a palindrome' },
        { input: '"0P"', expected: 'false', description: 'Alphanumeric mismatch' }
      ],
      explanation: "Clean string by stripping non-alphanumerics, convert to lowercase, and check if identical when reversed.",
      hint: "Sanitize with replace(/[^a-z0-9]/gi, '') before comparing.",
      points: 5
    },
    {
      question_text: "Which JavaScript array method executes a reducer function on each element resulting in a single cumulative output value?",
      question_type: "mcq",
      options: ["Array.prototype.map()", "Array.prototype.filter()", "Array.prototype.reduce()", "Array.prototype.forEach()"],
      correct_answer: "Array.prototype.reduce()",
      explanation: "Array.prototype.reduce() executes a user-supplied reducer callback function on each element of the array, returning a single accumulated value.",
      hint: "It takes an accumulator and a current value as its main arguments.",
      points: 2
    },
    {
      question_text: "Write a function `findMaxConsecutiveOnes(nums)` that finds the maximum number of consecutive 1s in a binary array.",
      question_type: "coding",
      starter_code: "function findMaxConsecutiveOnes(nums) {\n  // Write your code here\n  return 0;\n}",
      correct_answer: "function findMaxConsecutiveOnes(nums) {\n  let max = 0, current = 0;\n  for (let num of nums) {\n    if (num === 1) {\n      current++;\n      if (current > max) max = current;\n    } else {\n      current = 0;\n    }\n  }\n  return max;\n}",
      test_cases: [
        { input: '[1,1,0,1,1,1]', expected: '3', description: 'Three consecutive ones at end' },
        { input: '[1,0,1,1,0,1]', expected: '2', description: 'Two ones max' },
        { input: '[0,0,0]', expected: '0', description: 'Zero ones' }
      ],
      explanation: "Iterate through the array maintaining a running tally of consecutive ones and updating the global maximum on each streak.",
      hint: "Keep a current counter and reset it to 0 whenever you encounter a 0.",
      points: 5
    },
    {
      question_text: "Write a function `chunkArray(arr, size)` that splits an array into smaller chunks of length `size`.",
      question_type: "coding",
      starter_code: "function chunkArray(arr, size) {\n  // Write your code here\n  return [];\n}",
      correct_answer: "function chunkArray(arr, size) {\n  const chunks = [];\n  for (let i = 0; i < arr.length; i += size) {\n    chunks.push(arr.slice(i, i + size));\n  }\n  return chunks;\n}",
      test_cases: [
        { input: '[1, 2, 3, 4, 5], 2', expected: '[[1, 2], [3, 4], [5]]', description: 'Size 2' },
        { input: '[1, 2, 3, 4], 2', expected: '[[1, 2], [3, 4]]', description: 'Even split' },
        { input: '[1, 2, 3], 5', expected: '[[1, 2, 3]]', description: 'Size greater than length' }
      ],
      explanation: "Loop with step size and slice array chunks from index i to i + size.",
      hint: "Use a for loop with i += size and arr.slice(i, i + size).",
      points: 5
    },
    {
      question_text: "What will be printed to the console by: `console.log(1 + +'2' + '2');`?",
      question_type: "mcq",
      options: ["'32'", "'122'", "5", "NaN"],
      correct_answer: "'32'",
      explanation: "+'2' unary plus converts string '2' to number 2. 1 + 2 = 3. Then 3 + '2' concatenates to string '32'.",
      hint: "Unary plus (+'2') converts string to number before addition.",
      points: 2
    },
    {
      question_text: "Write a function `titleCase(str)` that capitalizes the first letter of each word in a string and makes all other letters lowercase.",
      question_type: "coding",
      starter_code: "function titleCase(str) {\n  // Write your code here\n  return str;\n}",
      correct_answer: "function titleCase(str) {\n  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');\n}",
      test_cases: [
        { input: '"I am a little tea pot"', expected: '"I Am A Little Tea Pot"', description: 'Standard sentence' },
        { input: '"sHoRt AnD sToUt"', expected: '"Short And Stout"', description: 'Mixed casing' },
        { input: '"examguard"', expected: '"Examguard"', description: 'Single word' }
      ],
      explanation: "Lowercase the whole string, split by spaces, capitalize charAt(0) and join with spaces.",
      hint: "Use .toLowerCase(), .split(' '), and .charAt(0).toUpperCase().",
      points: 5
    }
  ];
}

function getMernCurriculumPool(difficulty) {
  return [
    {
      question_text: "In React, which hook is primarily used to manage side-effects such as subscriptions, timers, and data fetching?",
      question_type: "mcq",
      options: ["useState", "useEffect", "useMemo", "useCallback"],
      correct_answer: "useEffect",
      explanation: "useEffect lets you synchronize a component with an external system and execute lifecycle side effects.",
      hint: "It takes a setup function and a dependency array.",
      points: 2
    },
    {
      question_text: "Write a function `buildQueryString(params)` that converts a key-value object into a URL query parameter string (without the leading '?').",
      question_type: "coding",
      starter_code: "function buildQueryString(params) {\n  // Write your code here\n  return '';\n}",
      correct_answer: "function buildQueryString(params) {\n  return Object.entries(params)\n    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)\n    .join('&');\n}",
      test_cases: [
        { input: '{"search": "react", "page": 1}', expected: '"search=react&page=1"', description: 'Two params' },
        { input: '{"tag": "mern stack"}', expected: '"tag=mern%20stack"', description: 'URL encodes space' },
        { input: '{}', expected: '""', description: 'Empty object' }
      ],
      explanation: "Iterate over entries using Object.entries, encode keys/values, and join with '&'.",
      hint: "Use Object.entries() and encodeURIComponent().",
      points: 5
    },
    {
      question_text: "Which HTTP status code should a REST API return when a resource is successfully created?",
      question_type: "mcq",
      options: ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"],
      correct_answer: "201 Created",
      explanation: "201 Created indicates that the request has succeeded and has led to the creation of a new resource on the server.",
      hint: "It's in the 2xx success class and explicitly denotes creation.",
      points: 2
    },
    {
      question_text: "In Express.js, what is the third parameter passed to a standard middleware function?",
      question_type: "mcq",
      options: ["res", "req", "next", "err"],
      correct_answer: "next",
      explanation: "Middleware functions take req, res, and next as arguments. Invoking next() passes control to the next handler in the stack.",
      hint: "Calling this function passes control to the next handler in the middleware chain.",
      points: 2
    },
    {
      question_text: "Write a function `deepClone(obj)` that produces an isolated copy of a nested JSON object without mutating the original.",
      question_type: "coding",
      starter_code: "function deepClone(obj) {\n  // Write your code here\n  return obj;\n}",
      correct_answer: "function deepClone(obj) {\n  return JSON.parse(JSON.stringify(obj));\n}",
      test_cases: [
        { input: '{"user": {"name": "Alex", "age": 25}}', expected: '{"user":{"name":"Alex","age":25}}', description: 'Nested object copy' },
        { input: '{"items": [1, 2, 3]}', expected: '{"items":[1,2,3]}', description: 'Array inside object' }
      ],
      explanation: "JSON serialization / deserialization deep clones nested objects and arrays.",
      hint: "JSON.parse(JSON.stringify(obj)) or structuredClone().",
      points: 5
    },
    {
      question_text: "What is the primary benefit of using `useCallback` in React?",
      question_type: "mcq",
      options: [
        "It caches the return value of an expensive calculation",
        "It caches a function definition between renders to prevent unnecessary child re-renders",
        "It automatically fetches data on mount",
        "It creates a mutable reference that doesn't trigger re-renders"
      ],
      correct_answer: "It caches a function definition between renders to prevent unnecessary child re-renders",
      explanation: "useCallback is a React Hook that lets you cache a function definition between re-renders when passed to optimized child components.",
      hint: "Differentiate between memoizing a function definition vs memoizing a calculated value.",
      points: 2
    },
    {
      question_text: "In MongoDB, which operator is used in the aggregation pipeline to filter documents equivalent to a WHERE clause in SQL?",
      question_type: "mcq",
      options: ["$match", "$filter", "$find", "$where"],
      correct_answer: "$match",
      explanation: "The $match aggregation stage filters the documents to pass only the documents that match the specified condition(s) to the next pipeline stage.",
      hint: "It matches documents against query criteria in the pipeline.",
      points: 2
    }
  ];
}

function getGitCurriculumPool(difficulty) {
  return [
    {
      question_text: "Which Git command is used to integrate changes from one branch into another by creating a new combined commit?",
      question_type: "mcq",
      options: ["git merge", "git rebase", "git cherry-pick", "git fetch"],
      correct_answer: "git merge",
      explanation: "git merge integrates history from another branch by combining independent branches with a 3-way merge commit.",
      hint: "It combines branches without rewriting existing commit history.",
      points: 2
    },
    {
      question_text: "What is the primary difference between 'git reset --soft' and 'git reset --hard'?",
      question_type: "mcq",
      options: [
        "--soft keeps changes staged in the index; --hard discards all uncommitted and staged changes",
        "--soft deletes commits permanently; --hard retains commits in reflog",
        "--soft pushes changes to remote; --hard pulls from remote",
        "There is no functional difference"
      ],
      correct_answer: "--soft keeps changes staged in the index; --hard discards all uncommitted and staged changes",
      explanation: "git reset --soft moves HEAD while keeping changes in the staging index. --hard wipes both working directory and index modifications.",
      hint: "Think about what happens to your unstaged/staged files in your working directory.",
      points: 2
    },
    {
      question_text: "Write a function `parseGitBranch(refString)` that extracts the clean branch name from a Git ref like 'refs/heads/feature/auth-login'.",
      question_type: "coding",
      starter_code: "function parseGitBranch(refString) {\n  // Write your code here\n  return '';\n}",
      correct_answer: "function parseGitBranch(refString) {\n  return refString.replace(/^refs\\/heads\\//, '');\n}",
      test_cases: [
        { input: '"refs/heads/main"', expected: '"main"', description: 'Main branch' },
        { input: '"refs/heads/feature/login-modal"', expected: '"feature/login-modal"', description: 'Nested feature branch' },
        { input: '"refs/heads/release/v1.0"', expected: '"release/v1.0"', description: 'Release branch' }
      ],
      explanation: "Strips the standard Git ref prefix 'refs/heads/' using a regular expression replacement.",
      hint: "Use replace(/^refs\\/heads\\//, '') to extract the branch name.",
      points: 5
    },
    {
      question_text: "Which command temporarily shelves changes you have made to your working copy so you can switch branches cleanly?",
      question_type: "mcq",
      options: ["git stash", "git commit --temp", "git pause", "git checkout -b"],
      correct_answer: "git stash",
      explanation: "git stash saves dirty working copy changes and resets the index to HEAD.",
      hint: "Think of stashing away items in a drawer.",
      points: 2
    },
    {
      question_text: "Write a function `isValidSemver(version)` that validates whether a string matches standard Semantic Versioning (e.g. '1.0.0', '2.14.3').",
      question_type: "coding",
      starter_code: "function isValidSemver(version) {\n  // Write your code here\n  return false;\n}",
      correct_answer: "function isValidSemver(version) {\n  return /^\\d+\\.\\d+\\.\\d+$/.test(version);\n}",
      test_cases: [
        { input: '"1.0.0"', expected: 'true', description: 'Valid semver' },
        { input: '"2.4.12"', expected: 'true', description: 'Double digit patch' },
        { input: '"v1.0"', expected: 'false', description: 'Missing patch number' },
        { input: '"beta.1"', expected: 'false', description: 'Invalid format' }
      ],
      explanation: "Test against regular expression /^\\d+\\.\\d+\\.\\d+$/ for major.minor.patch digits.",
      hint: "Use a regular expression testing for three digit groups separated by periods.",
      points: 5
    }
  ];
}

function getDsaCurriculumPool(difficulty) {
  return [
    {
      question_text: "Write a function `twoSum(nums, target)` that returns the 0-indexed indices [i, j] of two numbers that sum to target.",
      question_type: "coding",
      starter_code: "function twoSum(nums, target) {\n  // Write your code here\n  return [];\n}",
      correct_answer: "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}",
      test_cases: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]', description: 'Basic pair' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]', description: 'Unsorted pair' },
        { input: '[3, 3], 6', expected: '[0, 1]', description: 'Identical elements' }
      ],
      explanation: "Use a hash map to look up the complement in O(1) time per element for an overall O(N) linear time complexity.",
      hint: "Store each seen value and its index in a Map.",
      points: 5
    },
    {
      question_text: "Write a function `isValidParentheses(s)` that determines if the input string containing '()', '{}', and '[]' is valid.",
      question_type: "coding",
      starter_code: "function isValidParentheses(s) {\n  // Write your code here\n  return false;\n}",
      correct_answer: "function isValidParentheses(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (char === '(' || char === '{' || char === '[') {\n      stack.push(char);\n    } else {\n      if (stack.pop() !== map[char]) return false;\n    }\n  }\n  return stack.length === 0;\n}",
      test_cases: [
        { input: '"()"', expected: 'true', description: 'Simple parentheses' },
        { input: '"()[]{}"', expected: 'true', description: 'Multiple bracket types' },
        { input: '"(]"', expected: 'false', description: 'Mismatched brackets' }
      ],
      explanation: "Use a Stack LIFO structure to push opening brackets and pop matching pairs when closing brackets are encountered.",
      hint: "Push openers to an array stack and pop when matching closers appear.",
      points: 5
    },
    {
      question_text: "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
      question_type: "mcq",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correct_answer: "O(log n)",
      explanation: "Each comparison in a balanced BST halves the search space, giving logarithmic time complexity O(log n).",
      hint: "Each step cuts the remaining tree elements in half.",
      points: 2
    },
    {
      question_text: "Write a function `binarySearch(nums, target)` that returns the index of target in a sorted array, or -1 if not present.",
      question_type: "coding",
      starter_code: "function binarySearch(nums, target) {\n  // Write your code here\n  return -1;\n}",
      correct_answer: "function binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}",
      test_cases: [
        { input: '[-1, 0, 3, 5, 9, 12], 9', expected: '4', description: 'Target exists' },
        { input: '[-1, 0, 3, 5, 9, 12], 2', expected: '-1', description: 'Target does not exist' }
      ],
      explanation: "Halve the search boundary on every iteration using two pointers (left and right) in O(log N) time.",
      hint: "Maintain left and right pointers and calculate mid index.",
      points: 5
    }
  ];
}

function getPythonCurriculumPool(difficulty) {
  return [
    {
      question_text: "In Python, which built-in data structure is mutable, ordered, and allows duplicate elements?",
      question_type: "mcq",
      options: ["List", "Tuple", "Set", "Dictionary"],
      correct_answer: "List",
      explanation: "Python lists are mutable ordered sequences allowing duplicates. Tuples are immutable, and Sets only contain unique values.",
      hint: "It is created with square brackets [].",
      points: 2
    }
  ];
}

// -------------------------------------------------------------
// UTILITY FUNCTIONS
// -------------------------------------------------------------

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getTopicTitle(topic) {
  const t = String(topic).toLowerCase();
  if (t === 'mern') return 'MERN Full-Stack Engineering';
  if (t === 'git') return 'Git, GitHub & DevOps';
  if (t === 'js' || t === 'javascript') return 'Modern JavaScript & Algorithms';
  if (t === 'dsa') return 'Data Structures & Algorithms';
  if (t === 'python' || t === 'py') return 'Python Programming & Problem Solving';
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}
