'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function TeacherExamDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());
  const [accessType, setAccessType] = useState('all');
  const [allowedBatch, setAllowedBatch] = useState('Batch 1 (Morning)');
  const [requirePhoneSidecar, setRequirePhoneSidecar] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  
  // UI Tabs & Modes
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'candidates'
  const [creationMode, setCreationMode] = useState('bulk'); // 'bulk' | 'single'
  
  // Single Question Form State
  const [qType, setQType] = useState('mcq');
  const [qText, setQText] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [mcqCorrect, setMcqCorrect] = useState(0);
  const [shortAnswerCorrect, setShortAnswerCorrect] = useState('');
  const [qPoints, setQPoints] = useState(1);
  const [starterCode, setStarterCode] = useState("function solution(arr) {\n  // Write your code here\n  return arr;\n}");
  const [testCases, setTestCases] = useState([
    { input: '[1, 2, 3]', expected_output: '[3, 2, 1]', description: 'Sample Test Case 1', hidden: false }
  ]);
  
  // Bulk Import State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState([]);
  
  // Loading & Notifications
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [savingCandidates, setSavingCandidates] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchExamAndData();
  }, [id]);

  useEffect(() => {
    if (bulkInput.trim()) {
      try {
        const parsed = parseBulkInput(bulkInput);
        setParsedPreview(parsed);
      } catch (err) {
        setParsedPreview([]);
      }
    } else {
      setParsedPreview([]);
    }
  }, [bulkInput]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: 'success' }), 4500);
  };

  const fetchExamAndData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Exam
      const { data: examData, error: examErr } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();
      if (examErr) throw examErr;
      setExam(examData);
      setAccessType(examData.access_type || 'all');
      setAllowedBatch(examData.allowed_batch || 'Batch 1 (Morning)');
      setRequirePhoneSidecar(examData.require_phone_sidecar || false);

      // 2. Fetch Questions
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;

      const normalizedQData = (qData || []).map(q => {
        let sc = q.starter_code || '';
        let tc = q.test_cases || [];
        let qType = q.question_type;
        if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
          if (q.options.starter_code) sc = q.options.starter_code;
          if (q.options.test_cases) tc = q.options.test_cases;
          if (q.options.is_coding || q.options.starter_code) qType = 'coding';
        }
        return { ...q, question_type: qType, starter_code: sc, test_cases: tc };
      });
      setQuestions(normalizedQData);

      // 3. Fetch Registered Students for this subject track
      const { data: studentList, error: studentErr } = await supabase
        .from('profiles')
        .select('id, full_name, batch, subject, created_at')
        .eq('role', 'student')
        .eq('subject', examData.subject);
        
      if (studentErr) throw studentErr;
      setStudents(studentList || []);

      // 4. Fetch already assigned candidates for this exam
      const { data: candidateData } = await supabase
        .from('exam_candidates')
        .select('student_id')
        .eq('exam_id', id);

      if (candidateData && candidateData.length > 0) {
        setSelectedCandidateIds(new Set(candidateData.map(c => c.student_id)));
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const newStatus = !exam.is_published;
      const { error } = await supabase
        .from('exams')
        .update({ is_published: newStatus })
        .eq('id', exam.id);
      
      if (error) throw error;
      setExam({ ...exam, is_published: newStatus });
      showNotification(`Exam is now ${newStatus ? 'Published & Live for Eligible Students' : 'Unpublished (Draft)'}`);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteExam = async () => {
    if (!confirm(`Are you sure you want to remove "${exam.title}"?\n\nThis will remove the exam from active listings while safely preserving historical student submissions and answer keys in student records.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          is_published: false,
          title: exam.title?.startsWith('[Archived]') ? exam.title : `[Archived] ${exam.title}`
        })
        .eq('id', id);

      if (error) throw error;
      router.push('/dashboard/teacher');
    } catch (err) {
      showNotification(err.message, 'error');
      setDeleteLoading(false);
    }
  };

  // Save Candidate & Access Settings
  const handleSaveAccessSettings = async () => {
    setSavingCandidates(true);
    try {
      const { error: examErr } = await supabase
        .from('exams')
        .update({ 
          access_type: accessType,
          allowed_batch: accessType === 'batch' ? allowedBatch : null,
          require_phone_sidecar: requirePhoneSidecar
        })
        .eq('id', id);

      if (examErr) throw examErr;

      if (accessType === 'selected') {
        await supabase.from('exam_candidates').delete().eq('exam_id', id);
        
        if (selectedCandidateIds.size > 0) {
          const candidateRecords = Array.from(selectedCandidateIds).map(student_id => ({
            exam_id: id,
            student_id
          }));
          const { error: insertErr } = await supabase.from('exam_candidates').insert(candidateRecords);
          if (insertErr) throw insertErr;
        }
      }

      setExam({
        ...exam,
        access_type: accessType,
        allowed_batch: accessType === 'batch' ? allowedBatch : null
      });

      showNotification('✅ Student access & batch permissions updated successfully!');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSavingCandidates(false);
    }
  };

  const toggleStudentCandidate = (studentId) => {
    const next = new Set(selectedCandidateIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedCandidateIds(next);
  };

  const selectAllStudents = () => {
    const allIds = new Set(students.map(s => s.id));
    setSelectedCandidateIds(allIds);
  };

  const deselectAllStudents = () => {
    setSelectedCandidateIds(new Set());
  };

  const selectStudentsByBatch = (batchName) => {
    const batchStudentIds = students.filter(s => (s.batch || 'Batch 1 (Morning)') === batchName).map(s => s.id);
    const next = new Set(selectedCandidateIds);
    batchStudentIds.forEach(id => next.add(id));
    setSelectedCandidateIds(next);
    showNotification(`Selected all students in ${batchName}`);
  };

  // Add Single Question
  const handleAddSingleQuestion = async (e) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      let options = null;
      let correctAnswer = null;
      let validTestCases = [];

      if (qType === 'mcq') {
        options = mcqOptions;
        correctAnswer = mcqOptions[mcqCorrect];
        if (options.some(o => !o.trim())) throw new Error("All 4 MCQ options must be filled.");
      } else if (qType === 'short_answer') {
        correctAnswer = shortAnswerCorrect.trim();
        if (!correctAnswer) throw new Error("Please specify the correct answer for automated scoring.");
      } else if (qType === 'project' || qType === 'coding') {
        validTestCases = testCases.filter(tc => tc.input.trim() || tc.expected_output.trim());
      }

      const points = parseInt(qPoints) || 1;
      const isCodeType = qType === 'project' || qType === 'coding';
      const newQ = {
        exam_id: id,
        question_text: qText.trim(),
        question_type: qType,
        options,
        correct_answer: correctAnswer,
        points,
        order_index: questions.length,
        starter_code: isCodeType ? starterCode : null,
        test_cases: isCodeType ? validTestCases : []
      };

      let insertedData = null;
      try {
        const { data, error } = await supabase.from('questions').insert([newQ]).select().single();
        if (error) throw error;
        insertedData = data;
      } catch (insertErr) {
        // Fallback: If DB table violates check constraint or lacks columns, store as 'project' with options JSONB
        const errMsg = String(insertErr?.message || '');
        const fallbackQ = {
          exam_id: id,
          question_text: qText.trim(),
          question_type: (qType === 'coding') ? 'project' : qType,
          options: isCodeType ? { is_coding: true, starter_code: starterCode, test_cases: validTestCases } : options,
          correct_answer: correctAnswer,
          points,
          order_index: questions.length
        };
        const { data: fbData, error: fbErr } = await supabase.from('questions').insert([fallbackQ]).select().single();
        if (fbErr) throw fbErr;
        insertedData = { ...fbData, question_type: qType, starter_code: starterCode, test_cases: validTestCases };
      }

      const updatedMarks = (exam.total_marks || 0) + points;
      await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
      setExam({ ...exam, total_marks: updatedMarks });
      setQuestions([...questions, insertedData]);
      
      setQText('');
      setMcqOptions(['', '', '', '']);
      setMcqCorrect(0);
      setShortAnswerCorrect('');
      setStarterCode("function solution(arr) {\n  // Write your code here\n  return arr;\n}");
      setTestCases([
        { input: '[1, 2, 3]', expected_output: '[3, 2, 1]', description: 'Sample Test Case 1', hidden: false }
      ]);
      setQPoints(1);
      showNotification('Question added successfully!');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      { input: '', expected_output: '', description: `Test Case #${testCases.length + 1}`, hidden: false }
    ]);
  };

  const handleRemoveTestCase = (index) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const loadCodingPreset = (presetType) => {
    if (presetType === 'reverse') {
      setQText('Write a JavaScript function `solution(arr)` that takes an array and returns a new array with elements in reversed order.');
      setStarterCode('function solution(arr) {\n  // Return reversed array\n  return arr.slice().reverse();\n}');
      setTestCases([
        { input: '[1, 2, 3, 4]', expected_output: '[4, 3, 2, 1]', description: 'Standard integer array', hidden: false },
        { input: '["react", "node", "express"]', expected_output: '["express", "node", "react"]', description: 'String array', hidden: false },
        { input: '[]', expected_output: '[]', description: 'Empty array edge-case', hidden: true }
      ]);
      setQPoints(5);
    } else if (presetType === 'two_sum') {
      setQText('Write a function `solution(nums, target)` that returns the indices `[i, j]` of the two numbers in `nums` that add up to `target`.');
      setStarterCode('function solution(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}');
      setTestCases([
        { input: '[[2, 7, 11, 15], 9]', expected_output: '[0, 1]', description: 'Basic sum target 9', hidden: false },
        { input: '[[3, 2, 4], 6]', expected_output: '[1, 2]', description: 'Array [3,2,4] target 6', hidden: false }
      ]);
      setQPoints(10);
    } else if (presetType === 'palindrome') {
      setQText('Write a function `solution(str)` that returns `true` if the string is a palindrome, or `false` otherwise (ignoring non-alphanumeric characters).');
      setStarterCode('function solution(str) {\n  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return clean === clean.split("").reverse().join("");\n}');
      setTestCases([
        { input: '"racecar"', expected_output: 'true', description: 'Simple palindrome', hidden: false },
        { input: '"hello world"', expected_output: 'false', description: 'Non-palindrome phrase', hidden: false },
        { input: '"A man, a plan, a canal: Panama"', expected_output: 'true', description: 'Phrase with spaces and punctuation', hidden: true }
      ]);
      setQPoints(5);
    }
  };

  // Parse bulk text/JSON/CSV
  const parseBulkInput = (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        
        let rawList = [];
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed.mcqs)) rawList = [...rawList, ...parsed.mcqs];
          if (Array.isArray(parsed.coding_problems)) rawList = [...rawList, ...parsed.coding_problems];
          if (Array.isArray(parsed.questions)) rawList = [...rawList, ...parsed.questions];
          
          if (rawList.length === 0) {
             rawList = [parsed];
          }
        }

        return rawList.map(item => ({
          question_text: item.question || item.question_text || item.text || item.problem || '',
          question_type: (item.type || item.question_type || (item.starter_code || item.test_cases || item.problem ? 'coding' : item.options ? 'mcq' : 'short_answer')).toLowerCase(),
          options: item.options || null,
          correct_answer: String(item.answer || item.correct_answer || item.correct || ''),
          starter_code: item.starter_code || '',
          test_cases: item.test_cases || [],
          points: parseInt(item.points || item.marks || (item.starter_code || item.problem ? 5 : 1))
        })).filter(q => q.question_text && q.question_text.trim().length > 0);
      } catch (err) {
        // Fallback to text parsing
      }
    }

    if (trimmed.includes(',') && trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
      const isHeader = lines[0].toLowerCase().includes('question');
      const dataLines = isHeader ? lines.slice(1) : lines;
      
      const csvResults = [];
      for (const line of dataLines) {
        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 6) {
          csvResults.push({
            question_text: parts[0],
            question_type: 'mcq',
            options: [parts[1], parts[2], parts[3], parts[4]],
            correct_answer: parts[5],
            starter_code: '',
            test_cases: [],
            points: parseInt(parts[6]) || 1
          });
        }
      }
      if (csvResults.length > 0) return csvResults;
    }

    // Natural text parser
    const questionsList = [];
    const blocks = trimmed.split(/\n\s*\n+/);

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let qText = lines[0].replace(/^(Q\d+[:.]?|\d+[\).])\s*/i, '');
      let options = [];
      let correctAnswer = '';
      let points = 1;
      let qType = 'mcq';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const optMatch = line.match(/^([A-Da-d])[\).:-]\s*(.+)$/);
        const ansMatch = line.match(/^(Answer|Ans|Correct)[:.]?\s*(.+)$/i);
        const ptsMatch = line.match(/^(Points|Marks)[:.]?\s*(\d+)$/i);

        if (optMatch) {
          options.push(optMatch[2].trim());
        } else if (ansMatch) {
          const ansVal = ansMatch[2].trim();
          if (/^[A-D]$/i.test(ansVal) && options.length > 0) {
            const idx = ansVal.toUpperCase().charCodeAt(0) - 65;
            correctAnswer = options[idx] || ansVal;
          } else {
            correctAnswer = ansVal;
          }
        } else if (ptsMatch) {
          points = parseInt(ptsMatch[2]) || 1;
        }
      }

      if (options.length === 0) {
        qType = 'short_answer';
      }

      if (qText) {
        questionsList.push({
          question_text: qText,
          question_type: qType,
          options: options.length > 0 ? options : null,
          correct_answer: correctAnswer,
          starter_code: '',
          test_cases: [],
          points
        });
      }
    }

    return questionsList;
  };

  const handleBulkImport = async () => {
    if (parsedPreview.length === 0) return;
    setBulkLoading(true);

    try {
      const dbQuestions = parsedPreview.map((q, idx) => ({
        exam_id: id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        starter_code: q.starter_code || null,
        test_cases: q.test_cases && q.test_cases.length > 0 ? q.test_cases : null,
        points: q.points || 1,
        order_index: questions.length + idx
      }));

      let insertedData = null;
      try {
        const { data, error } = await supabase.from('questions').insert(dbQuestions).select();
        if (error) throw error;
        insertedData = data;
      } catch (bulkErr) {
        const fallbackDbQuestions = parsedPreview.map((q, idx) => ({
          exam_id: id,
          question_text: q.question_text,
          question_type: (q.question_type === 'coding') ? 'project' : q.question_type,
          options: (q.question_type === 'project' || q.question_type === 'coding')
            ? { is_coding: true, starter_code: q.starter_code || '', test_cases: q.test_cases || [] }
            : q.options,
          correct_answer: q.correct_answer,
          points: q.points || 1,
          order_index: questions.length + idx
        }));
        const { data: fbData, error: fbErr } = await supabase.from('questions').insert(fallbackDbQuestions).select();
        if (fbErr) throw fbErr;
        insertedData = fbData.map((d, idx) => ({
          ...d,
          question_type: parsedPreview[idx]?.question_type || 'coding',
          starter_code: parsedPreview[idx]?.starter_code || '',
          test_cases: parsedPreview[idx]?.test_cases || []
        }));
      }

      const addedPoints = parsedPreview.reduce((sum, q) => sum + (q.points || 1), 0);
      const updatedMarks = (exam.total_marks || 0) + addedPoints;
      
      await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
      
      setExam({ ...exam, total_marks: updatedMarks });
      setQuestions([...questions, ...insertedData]);
      setBulkInput('');
      setParsedPreview([]);
      showNotification(`🎉 Successfully imported ${insertedData.length} questions into the exam paper!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setBulkInput(content);
        showNotification(`Loaded file: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteQuestion = async (qId, points) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase.from('questions').delete().eq('id', qId);
      if (error) throw error;

      const updatedMarks = Math.max(0, (exam.total_marks || 0) - points);
      await supabase.from('exams').update({ total_marks: updatedMarks }).eq('id', id);
      
      setExam({ ...exam, total_marks: updatedMarks });
      setQuestions(questions.filter(q => q.id !== qId));
      showNotification('Question deleted.');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const loadSampleTemplate = (format) => {
    if (format === 'coding') {
      setBulkInput(JSON.stringify([
        {
          "question": "Write a function `reverseArray(arr)` that returns a new array with elements in reversed order.",
          "type": "coding",
          "starter_code": "function reverseArray(arr) {\n  // Your code here\n  return arr.reverse();\n}",
          "test_cases": [
            { "input": "[1, 2, 3, 4, 5]", "expected": "[5, 4, 3, 2, 1]", "hidden": false },
            { "input": "['apple', 'banana']", "expected": "['banana', 'apple']", "hidden": false },
            { "input": "[]", "expected": "[]", "hidden": true }
          ],
          "points": 5
        },
        {
          "question": "Write a function `isPalindrome(str)` returning true if the string reads identically backwards.",
          "type": "coding",
          "starter_code": "function isPalindrome(str) {\n  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}",
          "test_cases": [
            { "input": "'racecar'", "expected": "true", "hidden": false },
            { "input": "'hello'", "expected": "false", "hidden": false },
            { "input": "'A man a plan a canal Panama'", "expected": "true", "hidden": true }
          ],
          "points": 5
        }
      ], null, 2));
    } else if (format === 'json') {
      setBulkInput(JSON.stringify([
        {
          "question": "What is the primary role of the virtual DOM in React?",
          "type": "mcq",
          "options": ["Direct manipulation of native DOM nodes", "In-memory representation to minimize direct DOM re-renders", "Executing backend Node.js APIs", "Managing MongoDB indexing"],
          "answer": "In-memory representation to minimize direct DOM re-renders",
          "points": 2
        },
        {
          "question": "Which HTTP status code signifies a resource was successfully created?",
          "type": "short_answer",
          "answer": "201",
          "points": 1
        }
      ], null, 2));
    } else if (format === 'csv') {
      setBulkInput(`Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Points\nWhat command creates and switches to a new Git branch?,git branch -new,git checkout -b,git switch -c,git branch --create,git checkout -b,2\nWhich Express middleware parses incoming JSON request bodies?,express.urlencoded(),express.json(),bodyParser.text(),express.static(),express.json(),1`);
    } else {
      setBulkInput(`1. What hook is used in React to manage side effects and component lifecycle?
A) useState
B) useEffect
C) useContext
D) useReducer
Answer: B
Points: 2

2. What command resolves merge conflicts by rebasing the commit tree in Git?
A) git merge --rebase
B) git rebase
C) git pull --squash
D) git reset --hard
Answer: B
Points: 2`);
    }
  };

  const filteredStudents = students.filter(s => {
    const nameMatch = s.full_name?.toLowerCase().includes(studentSearch.toLowerCase());
    const batchMatch = s.batch?.toLowerCase().includes(studentSearch.toLowerCase());
    return nameMatch || batchMatch;
  });

  if (loading) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Exam Paper & Candidate Permissions...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Error Loading Exam</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'Exam paper not found'}</p>
        <Link href="/dashboard/teacher" className="btn btn-primary btn-md">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '1120px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/teacher" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
        <Link href={`/dashboard/teacher/results/${id}`} className="btn btn-ghost btn-sm">
          📊 View Candidate Results
        </Link>
      </div>

      {notification.message && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '24px',
          background: notification.type === 'error' ? '#fff1f2' : '#ecfdf5',
          border: `1px solid ${notification.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
          color: notification.type === 'error' ? '#e11d48' : '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
        }}>
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Exam Header Card */}
      <div className="glass-card-static" style={{ padding: '32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge-subject">{exam.subject?.toUpperCase()}</span>
              <span className={`badge-status ${exam.is_published ? 'badge-published' : 'badge-draft'}`}>
                {exam.is_published ? '● Published (Live)' : '○ Draft Mode'}
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '4px 10px', 
                borderRadius: '20px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                fontWeight: 600
              }}>
                🔒 {accessType === 'all' ? 'All Students' : accessType === 'batch' ? `Batch: ${allowedBatch}` : `${selectedCandidateIds.size} Selected Students`}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              {exam.title}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '16px', maxWidth: '600px' }}>
              {exam.description || 'No description provided.'}
            </p>
            <div className="exam-meta" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div className="exam-meta-item"><span>⏱️</span> <strong>{exam.duration_minutes}m</strong> duration</div>
              <div className="exam-meta-item"><span>🎯</span> <strong>{exam.total_marks}</strong> total marks</div>
              <div className="exam-meta-item"><span>🛡️</span> <strong>Max {exam.max_warnings || 3}</strong> warnings</div>
              <div className="exam-meta-item"><span>📝</span> <strong>{questions.length}</strong> questions</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              onClick={handleTogglePublish}
              className={`btn ${exam.is_published ? 'btn-ghost' : 'btn-primary'} btn-md`}
            >
              {exam.is_published ? '🚫 Unpublish (Draft)' : '🚀 Publish for Students'}
            </button>
            <button
              type="button"
              onClick={handleDeleteExam}
              disabled={deleteLoading}
              className="btn btn-danger btn-md"
            >
              {deleteLoading ? 'Deleting Exam...' : '🗑️ Delete Exam'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #eaecf0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('questions')}
          className={`btn btn-md ${activeTab === 'questions' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>📝</span> Question Paper ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`btn btn-md ${activeTab === 'candidates' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>👥</span> Eligible Students & Batch Access
          {accessType === 'selected' && (
            <span style={{ 
              background: '#059669', 
              color: '#ffffff',
              padding: '2px 8px', 
              borderRadius: '10px', 
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {selectedCandidateIds.size}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: QUESTION PAPER BUILDER */}
      {activeTab === 'questions' && (
        <div>
          {/* Add Question Card */}
          <div className="glass-card-static" style={{ padding: '32px', marginBottom: '36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Add Questions to Exam
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Import your question paper in bulk or compose individual questions
                </p>
              </div>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreationMode('single');
                    setQType('coding');
                  }}
                  className={`btn btn-sm ${creationMode === 'single' && qType === 'coding' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: '8px',
                    border: creationMode === 'single' && qType === 'coding' ? 'none' : '1px solid #10b981',
                    color: creationMode === 'single' && qType === 'coding' ? '#ffffff' : '#059669',
                    background: creationMode === 'single' && qType === 'coding' ? '#059669' : '#ecfdf5',
                    fontWeight: 700
                  }}
                >
                  💻 Add Live Coding Problem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreationMode('single');
                    setQType('mcq');
                  }}
                  className={`btn btn-sm ${creationMode === 'single' && qType === 'mcq' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '8px' }}
                >
                  🔘 Add MCQ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreationMode('single');
                    setQType('short_answer');
                  }}
                  className={`btn btn-sm ${creationMode === 'single' && qType === 'short_answer' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '8px' }}
                >
                  ✍️ Add Short Answer
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('bulk')}
                  className={`btn btn-sm ${creationMode === 'bulk' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '8px' }}
                >
                  ⚡ Bulk Import
                </button>
              </div>
            </div>

            {/* BULK IMPORT MODE */}
            {creationMode === 'bulk' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Load Sample Format:</span>
                    <button type="button" onClick={() => loadSampleTemplate('coding')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      💻 Coding Problems (JSON)
                    </button>
                    <button type="button" onClick={() => loadSampleTemplate('json')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                      📦 Standard JSON
                    </button>
                    <button type="button" onClick={() => loadSampleTemplate('text')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                      📄 Plain Text / AI Quiz
                    </button>
                    <button type="button" onClick={() => loadSampleTemplate('csv')} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                      📊 CSV
                    </button>
                  </div>

                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📁</span> Upload .json / .csv / .txt
                    <input 
                      type="file" 
                      accept=".json,.csv,.txt" 
                      onChange={handleFileUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label htmlFor="bulkInput">Paste Question Paper Content</label>
                    {parsedPreview.length > 0 && (
                      <span style={{ 
                        fontSize: '0.85rem', 
                        padding: '3px 10px', 
                        borderRadius: '8px', 
                        background: '#ecfdf5', 
                        color: '#059669', 
                        border: '1px solid #a7f3d0',
                        fontWeight: 600
                      }}>
                        ✨ {parsedPreview.length} Question{parsedPreview.length > 1 ? 's' : ''} Ready to Import
                      </span>
                    )}
                  </div>

                  <textarea
                    id="bulkInput"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="Paste questions here in Text, JSON, or CSV format... or click one of the 'Load Sample Format' buttons above!"
                    rows={8}
                    className="form-textarea"
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
                  />
                </div>

                {parsedPreview.length > 0 && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                        Preview: {parsedPreview.length} Parsed Question{parsedPreview.length > 1 ? 's' : ''}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Total Marks: {parsedPreview.reduce((sum, q) => sum + (parseInt(q.points) || 1), 0)} pts
                      </span>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {parsedPreview.map((q, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600 }}>
                            <span>{idx + 1}. {q.question_text}</span>
                            <span style={{ color: '#059669', flexShrink: 0, marginLeft: '12px' }}>{q.points} pt</span>
                          </div>
                          {q.options && (
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                              Options: {q.options.join(' | ')} (Correct: <span style={{ color: '#059669', fontWeight: 600 }}>{q.correct_answer}</span>)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={bulkLoading || parsedPreview.length === 0}
                  onClick={handleBulkImport}
                  className="btn btn-primary btn-lg w-full"
                >
                  {bulkLoading ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
                      <span>Importing Questions...</span>
                    </>
                  ) : (
                    <span>🚀 Import All {parsedPreview.length} Question{parsedPreview.length > 1 ? 's' : ''} to Exam</span>
                  )}
                </button>
              </div>
            )}

            {/* SINGLE QUESTION FORM MODE */}
            {creationMode === 'single' && (
              <form onSubmit={handleAddSingleQuestion}>
                <div className="form-group">
                  <label>Question Type</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'mcq', label: '🔘 Multiple Choice (MCQ)' },
                      { id: 'short_answer', label: '✍️ Short Answer' },
                      { id: 'project', label: '💻 Project / Code Challenge' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setQType(type.id)}
                        className={`btn btn-sm ${qType === type.id ? 'btn-primary' : 'btn-ghost'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="qText">Question Prompt</label>
                  <textarea 
                    id="qText"
                    required 
                    placeholder="Type your question or problem statement here..."
                    value={qText} 
                    onChange={(e) => setQText(e.target.value)}
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                {qType === 'mcq' && (
                  <div className="form-group">
                    <label>Answer Options (Select the radio button for the correct answer)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {mcqOptions.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input 
                            type="radio" 
                            name="correct_option" 
                            checked={mcqCorrect === i} 
                            onChange={() => setMcqCorrect(i)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            title="Mark as correct answer"
                          />
                          <input 
                            type="text" 
                            required 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...mcqOptions];
                              newOpts[i] = e.target.value;
                              setMcqOptions(newOpts);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="form-input"
                            style={{ padding: '10px 14px' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === 'short_answer' && (
                  <div className="form-group">
                    <label htmlFor="shortAns">Expected Correct Answer</label>
                    <input 
                      id="shortAns"
                      type="text" 
                      required 
                      placeholder="Exact answer required for automated scoring..."
                      value={shortAnswerCorrect} 
                      onChange={(e) => setShortAnswerCorrect(e.target.value)}
                      className="form-input"
                    />
                  </div>
                )}

                {(qType === 'project' || qType === 'coding') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <label style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        💻 Starter Boilerplate & Automated Test Cases
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
                        <button type="button" onClick={() => loadCodingPreset('reverse')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          Reverse Array
                        </button>
                        <button type="button" onClick={() => loadCodingPreset('two_sum')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          Two Sum
                        </button>
                        <button type="button" onClick={() => loadCodingPreset('palindrome')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          Palindrome
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="starterCodeInput" style={{ fontSize: '0.85rem' }}>Starter Code Template (JavaScript)</label>
                      <textarea
                        id="starterCodeInput"
                        rows={4}
                        value={starterCode}
                        onChange={(e) => setStarterCode(e.target.value)}
                        className="form-textarea"
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#0f172a', color: '#f8fafc' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                          Automated Test Cases ({testCases.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddTestCase}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          + Add Test Case
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {testCases.map((tc, idx) => (
                          <div key={idx} style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <input
                                type="text"
                                placeholder={`Test Case #${idx + 1} Description`}
                                value={tc.description}
                                onChange={(e) => handleUpdateTestCase(idx, 'description', e.target.value)}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600, maxWidth: '280px' }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={tc.hidden}
                                    onChange={(e) => handleUpdateTestCase(idx, 'hidden', e.target.checked)}
                                  />
                                  Hidden from student
                                </label>
                                {testCases.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTestCase(idx)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Input Argument(s):</span>
                                <input
                                  type="text"
                                  placeholder="e.g. [1, 2, 3] or 10, 20"
                                  value={tc.input}
                                  onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                                  className="form-input"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Expected Return Value:</span>
                                <input
                                  type="text"
                                  placeholder="e.g. [3, 2, 1] or 30"
                                  value={tc.expected_output}
                                  onChange={(e) => handleUpdateTestCase(idx, 'expected_output', e.target.value)}
                                  className="form-input"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                  <div className="form-group" style={{ width: '140px', marginBottom: 0 }}>
                    <label htmlFor="points">Points</label>
                    <input 
                      id="points"
                      type="number" 
                      required 
                      min="1"
                      value={qPoints} 
                      onChange={(e) => setQPoints(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={addLoading}
                    className="btn btn-primary btn-md"
                    style={{ marginTop: '26px' }}
                  >
                    {addLoading ? 'Saving...' : '➕ Add Question'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Question List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Current Question Paper ({questions.length} Question{questions.length !== 1 ? 's' : ''})
              </h3>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Total Marks: <strong>{exam.total_marks || 0} pts</strong>
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="glass-card-static" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', borderRadius: '16px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
                <p>No questions added to this exam yet. Use the bulk importer or form above to build your question paper.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {questions.map((q, i) => (
                  <div key={q.id} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                    <button 
                      onClick={() => handleDeleteQuestion(q.id, q.points)}
                      style={{ 
                        position: 'absolute', 
                        top: '20px', 
                        right: '20px', 
                        background: '#fff1f2', 
                        border: '1px solid #fecdd3', 
                        color: '#e11d48', 
                        cursor: 'pointer', 
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}
                      title="Delete question"
                    >
                      ✕
                    </button>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>Q{i + 1}</span>
                      <span className="badge-subject" style={{ fontSize: '0.75rem' }}>
                        {q.question_type?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>• {q.points} pt{q.points > 1 ? 's' : ''}</span>
                    </div>
                    
                    <p style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                      {q.question_text}
                    </p>
                    
                    {q.question_type === 'mcq' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        {q.options.map((opt, j) => {
                          const isCorrect = opt === q.correct_answer;
                          return (
                            <div key={j} style={{ 
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              background: isCorrect ? '#ecfdf5' : '#f8fafc',
                              border: `1px solid ${isCorrect ? '#a7f3d0' : '#e2e8f0'}`,
                              color: isCorrect ? '#065f46' : '#475569',
                              fontSize: '0.9rem',
                              fontWeight: isCorrect ? 600 : 400
                            }}>
                              <strong style={{ marginRight: '6px' }}>{String.fromCharCode(65 + j)}.</strong> {opt} {isCorrect && '✓ (Correct)'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {q.question_type === 'short_answer' && (
                      <div style={{ 
                        padding: '8px 14px', 
                        borderRadius: '6px', 
                        background: '#ecfdf5', 
                        border: '1px solid #a7f3d0', 
                        color: '#065f46', 
                        fontSize: '0.875rem',
                        display: 'inline-block'
                      }}>
                        Correct Answer: <strong>{q.correct_answer}</strong>
                      </div>
                    )}

                    {(q.question_type === 'project' || q.question_type === 'coding') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {q.starter_code && (
                          <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Starter Code Template:</div>
                            <pre style={{ margin: 0, color: '#f8fafc', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto' }}>
                              {q.starter_code}
                            </pre>
                          </div>
                        )}
                        {q.test_cases && q.test_cases.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Automated Test Cases:</span>
                            {q.test_cases.map((tc, tcIdx) => (
                              <span key={tcIdx} style={{
                                fontSize: '0.75rem',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span>🧪</span>
                                <strong>{tc.description || `Test #${tcIdx + 1}`}</strong>
                                {tc.hidden && <em style={{ color: '#94a3b8' }}>(hidden)</em>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ELIGIBLE STUDENTS & BATCH ACCESS */}
      {activeTab === 'candidates' && (
        <div>
          <div className="glass-card-static" style={{ padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Exam Candidate Eligibility & Access Control
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '24px' }}>
              Choose which students or cohorts can see and start this exam.
            </p>

            {/* Access Mode Selector */}
            <div className="form-group">
              <label style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'block' }}>
                Access Permission Level
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div 
                  onClick={() => setAccessType('all')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: accessType === 'all' ? '#ecfdf5' : '#ffffff',
                    border: `1px solid ${accessType === 'all' ? '#059669' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🌐</span>
                    <strong style={{ color: accessType === 'all' ? '#059669' : '#0f172a' }}>Open to All Students</strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                    Every student registered in the {exam.subject?.toUpperCase()} track can take this exam.
                  </p>
                </div>

                <div 
                  onClick={() => setAccessType('batch')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: accessType === 'batch' ? '#ecfdf5' : '#ffffff',
                    border: `1px solid ${accessType === 'batch' ? '#059669' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎓</span>
                    <strong style={{ color: accessType === 'batch' ? '#059669' : '#0f172a' }}>Specific Batch Cohort</strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                    Restricted strictly to students enrolled in a designated batch.
                  </p>
                </div>

                <div 
                  onClick={() => setAccessType('selected')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: accessType === 'selected' ? '#ecfdf5' : '#ffffff',
                    border: `1px solid ${accessType === 'selected' ? '#059669' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎯</span>
                    <strong style={{ color: accessType === 'selected' ? '#059669' : '#0f172a' }}>Selected Candidates Only</strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                    Manually assign and invite individual candidates from the student roster.
                  </p>
                </div>
              </div>
            </div>

            {/* Remote Exam / Dual-Angle Phone Sidecar Toggle */}
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: requirePhoneSidecar ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${requirePhoneSidecar ? '#a7f3d0' : '#e2e8f0'}`,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📱</span>
                  <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                    Require Mobile Phone Camera Sidecar (Remote / Home Proctoring)
                  </strong>
                </div>
                <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0, maxWidth: '650px' }}>
                  Forces students taking this exam remotely to scan a QR code on their smartphone to proctor their desk, hands, and keyboard angles simultaneously.
                </p>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={requirePhoneSidecar}
                  onChange={(e) => setRequirePhoneSidecar(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: requirePhoneSidecar ? '#059669' : '#cbd5e1',
                  borderRadius: '34px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: requirePhoneSidecar ? '24px' : '3px',
                    bottom: '3px',
                    background: '#ffffff',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>

            {/* BATCH SELECTOR (When Access Type is 'batch') */}
            {accessType === 'batch' && (
              <div className="form-group" style={{ maxWidth: '400px', marginBottom: '24px' }}>
                <label htmlFor="allowedBatchSelect">Target Student Batch</label>
                <select
                  id="allowedBatchSelect"
                  value={allowedBatch}
                  onChange={(e) => setAllowedBatch(e.target.value)}
                  className="form-select"
                >
                  <option value="Batch 1 (Morning)">Batch 1 (Morning Cohort)</option>
                  <option value="Batch 2 (Afternoon)">Batch 2 (Afternoon Cohort)</option>
                  <option value="Batch 3 (Evening)">Batch 3 (Evening Cohort)</option>
                  <option value="Weekend Batch">Weekend Batch</option>
                  <option value="Fast-Track Batch">Fast-Track Batch</option>
                </select>
              </div>
            )}

            {/* STUDENT ROSTER & SELECTION (When Access Type is 'selected') */}
            {accessType === 'selected' && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button type="button" onClick={selectAllStudents} className="btn btn-ghost btn-sm">
                      ✓ Select All ({students.length})
                    </button>
                    <button type="button" onClick={deselectAllStudents} className="btn btn-ghost btn-sm">
                      ✕ Deselect All
                    </button>
                  </div>

                  {/* Batch Fast-Select Buttons */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Select by Batch:</span>
                    {['Batch 1 (Morning)', 'Batch 2 (Afternoon)', 'Weekend Batch'].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => selectStudentsByBatch(b)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        + {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search candidate by name or batch..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Students Table */}
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No students found matching your criteria.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 16px', width: '40px' }}></th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Student Name</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Batch / Cohort</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Track</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => {
                          const isSelected = selectedCandidateIds.has(student.id);
                          return (
                            <tr 
                              key={student.id} 
                              onClick={() => toggleStudentCandidate(student.id)}
                              style={{ 
                                borderBottom: '1px solid #eaecf0',
                                background: isSelected ? '#ecfdf5' : '#ffffff',
                                cursor: 'pointer'
                              }}
                            >
                              <td style={{ padding: '12px 16px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleStudentCandidate(student.id)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                {student.full_name || 'Student Candidate'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                <span className="badge-subject" style={{ fontSize: '0.75rem' }}>
                                  {student.batch || 'Batch 1 (Morning)'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                {student.subject?.toUpperCase() || 'MERN'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  fontSize: '0.8rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: isSelected ? '#ecfdf5' : '#f1f5f9',
                                  color: isSelected ? '#059669' : '#64748b',
                                  fontWeight: 600
                                }}>
                                  {isSelected ? '✓ Eligible' : 'Excluded'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Save Access Button */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={savingCandidates}
                onClick={handleSaveAccessSettings}
                className="btn btn-primary btn-lg"
              >
                {savingCandidates ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
                    <span>Saving Permissions...</span>
                  </>
                ) : (
                  <span>💾 Save Candidate Permissions</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
