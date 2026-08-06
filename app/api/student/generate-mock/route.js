import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      topic = 'mern',
      customTopic = '',
      difficulty = 'intermediate',
      format = 'balanced', // 'balanced' | 'coding' | 'quiz'
      count = 5,
      duration = 20
    } = body;

    const activeTopic = (customTopic && customTopic.trim()) ? customTopic.trim() : topic;
    const apiKey = process.env.GEMINI_API_KEY;

    let mockQuestions = [];

    if (apiKey) {
      try {
        mockQuestions = await generateWithGemini(apiKey, {
          topic: activeTopic,
          difficulty,
          format,
          count: parseInt(count) || 5
        });
      } catch (geminiErr) {
        console.warn('Gemini API call encountered an error, falling back to dynamic curriculum synthesizer:', geminiErr.message);
        mockQuestions = synthesizeMockQuestions(activeTopic, difficulty, format, parseInt(count) || 5);
      }
    } else {
      mockQuestions = synthesizeMockQuestions(activeTopic, difficulty, format, parseInt(count) || 5);
    }

    const testId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalPoints = mockQuestions.reduce((acc, q) => acc + (q.points || 1), 0);

    const mockTest = {
      id: testId,
      title: `${getTopicTitle(activeTopic)} [AI Mock Exam]`,
      topic: activeTopic,
      difficulty,
      format,
      duration_minutes: parseInt(duration) || 20,
      total_marks: totalPoints,
      questions: mockQuestions,
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

async function generateWithGemini(apiKey, { topic, difficulty, format, count }) {
  const prompt = `You are an expert technical interviewer and computer science professor. Generate a high-quality assessment paper for a student.
Topic: "${topic}"
Difficulty Level: "${difficulty}"
Question Format: "${format}"
Total Questions to generate: ${count}

REQUIREMENTS:
1. If format is 'balanced': Generate a mix of Multiple Choice Questions (MCQ), 1 or 2 live JavaScript Coding Challenges, and Short Answer questions.
2. If format is 'coding': Generate ALL live JavaScript Coding Challenges.
3. If format is 'quiz': Generate Multiple Choice and Short Answer conceptual questions.
4. For every Coding Challenge:
   - Provide a clear problem description with function signature.
   - Provide 'starter_code' (e.g. function solution(...) { ... }).
   - Provide 'correct_answer' containing the full working JavaScript reference solution.
   - Provide 2 to 4 'test_cases' with valid JSON strings/numbers for 'input' and 'expected' (e.g. input: "[2, 7, 11, 15], 9", expected: "[0, 1]").
5. For every MCQ:
   - Provide exactly 4 options.
   - Provide the exact string of the correct option in 'correct_answer'.
   - Provide a 1-sentence 'explanation'.
6. Include a helpful 'hint' for every question to guide students in practice mode.

Return ONLY a valid JSON array of objects with NO markdown fences, matching this structure:
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini');

  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid JSON format returned by Gemini');
  }

  return parsed.map((q, idx) => ({
    id: `q_ai_${idx + 1}_${Date.now()}`,
    order_index: idx,
    question_text: q.question_text || `Question ${idx + 1}`,
    question_type: q.question_type || 'mcq',
    options: Array.isArray(q.options) ? q.options : null,
    correct_answer: q.correct_answer || '',
    starter_code: q.starter_code || (q.question_type === 'coding' ? 'function solution(input) {\n  // Write your code here\n  return input;\n}' : null),
    test_cases: Array.isArray(q.test_cases) ? q.test_cases : [],
    explanation: q.explanation || '',
    hint: q.hint || 'Think about the core fundamental concepts of this topic.',
    points: q.points || (q.question_type === 'coding' ? 5 : 2)
  }));
}

function synthesizeMockQuestions(topic, difficulty, format, count) {
  const topicKey = String(topic).toLowerCase();
  let bank = [];

  if (topicKey.includes('git')) {
    bank = getGitQuestionBank(difficulty);
  } else if (topicKey.includes('react') || topicKey.includes('mern') || topicKey.includes('node') || topicKey.includes('express')) {
    bank = getMernQuestionBank(difficulty);
  } else if (topicKey.includes('dsa') || topicKey.includes('algo') || topicKey.includes('structure')) {
    bank = getDsaQuestionBank(difficulty);
  } else {
    bank = getJsQuestionBank(difficulty);
  }

  // Filter bank by format
  if (format === 'coding') {
    bank = bank.filter(q => q.question_type === 'coding');
    if (bank.length === 0) bank = getDsaQuestionBank(difficulty).filter(q => q.question_type === 'coding');
  } else if (format === 'quiz') {
    bank = bank.filter(q => q.question_type !== 'coding');
  }

  // Shuffle and slice
  const shuffled = [...bank].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((q, idx) => ({
    ...q,
    id: `q_synth_${idx + 1}_${Date.now()}`,
    order_index: idx
  }));
}

function getTopicTitle(topic) {
  const t = String(topic).toLowerCase();
  if (t === 'mern') return 'MERN Full-Stack Development';
  if (t === 'git') return 'Git & GitHub Version Control';
  if (t === 'js' || t === 'javascript') return 'Modern JavaScript & Algorithms';
  if (t === 'dsa') return 'Data Structures & Algorithms';
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

// Built-in Question Banks for Instant Zero-Config Offline Reliability
function getJsQuestionBank(difficulty) {
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
      question_text: "Briefly explain the difference between '==' and '===' in JavaScript.",
      question_type: "short_answer",
      correct_answer: "== performs type coercion before comparison, whereas === (strict equality) checks both value and type without coercion.",
      explanation: "Strict equality (===) prevents unexpected type casting issues like false == 0.",
      hint: "Mention type coercion.",
      points: 3
    }
  ];
}

function getMernQuestionBank(difficulty) {
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
      explanation: "Middleware functions take req, res, and next as arguments. Invoking next() passes control to the next handler.",
      hint: "Calling this function passes control to the next handler in the stack.",
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
    }
  ];
}

function getGitQuestionBank(difficulty) {
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
    }
  ];
}

function getDsaQuestionBank(difficulty) {
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
      question_text: "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
      question_type: "mcq",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correct_answer: "O(log n)",
      explanation: "Each comparison in a balanced BST halves the search space, giving logarithmic time complexity O(log n).",
      hint: "Each step cuts the remaining tree elements in half.",
      points: 2
    }
  ];
}
