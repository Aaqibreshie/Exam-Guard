/**
 * Question Parser for ExamGuard
 * Supports: JSON, CSV, and Natural Text / AI-Generated quiz formats
 */

export function parseJSON(content) {
  try {
    const data = JSON.parse(content);
    let list = [];
    
    // Auto-extract arrays of questions from arbitrary JSON formats
    if (Array.isArray(data)) {
      list = data;
    } else if (typeof data === 'object' && data !== null) {
      // If it has 'questions', use that
      if (Array.isArray(data.questions)) {
        list = data.questions;
      } else {
        // Otherwise, extract ANY arrays found in the root object (like data.mcqs, data.coding_problems)
        for (const key in data) {
          if (Array.isArray(data[key])) {
            list = list.concat(data[key]);
          }
        }
        // If no arrays found, just treat the object itself as a single question
        if (list.length === 0) list = [data];
      }
    }
    
    return list.map((item, index) => {
      // Also look for item.title or item.prompt just in case
      const qText = item.question || item.question_text || item.text || item.title || item.prompt || '';
      let qType = item.type || item.question_type || (item.options ? 'mcq' : 'short_answer');
      
      let parsedOptions = null;
      let correct = item.correct_answer || item.answer || item.correctAnswer || '';

      if (Array.isArray(item.options)) {
        parsedOptions = item.options.map(String);
      } else if (item.options && typeof item.options === 'object') {
        // e.g. {"A": "Option 1", "B": "Option 2"}
        parsedOptions = Object.values(item.options).map(String);
        
        // If the correct answer is a key like "A", "B", map it to the value
        if (typeof correct === 'string' && item.options[correct]) {
          correct = item.options[correct];
        }
      }

      // If correct answer is an index (0, 1, 2...)
      if (parsedOptions && typeof correct === 'number' && parsedOptions[correct]) {
        correct = parsedOptions[correct];
      }
      
      // Auto-detect coding problems
      if (!item.options && (item.starter_code || item.test_cases || String(qText).toLowerCase().includes('write a function'))) {
        qType = 'coding';
      }

      return {
        question_text: qText.trim(),
        question_type: ['mcq', 'short_answer', 'project', 'coding'].includes(qType) ? qType : (parsedOptions ? 'mcq' : 'short_answer'),
        options: parsedOptions,
        correct_answer: correct ? String(correct).trim() : null,
        points: parseInt(item.points) || 1,
        order_index: index,
        starter_code: item.starter_code || null,
        test_cases: item.test_cases || null
      };
    }).filter(q => q.question_text && q.question_text.length > 0);
  } catch (err) {
    throw new Error(`Invalid JSON format: ${err.message}`);
  }
}

export function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Helper to split CSV row handling quoted strings
  const parseRow = (row) => {
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)|(?<=,)(?=,)|^,/g;
    const result = [];
    let match;
    while ((match = regex.exec(row)) !== null) {
      if (match[1] !== undefined) {
        result.push(match[1].replace(/\"\"/g, '"').trim());
      } else if (match[2] !== undefined) {
        result.push(match[2].trim());
      } else {
        result.push('');
      }
    }
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const hasHeaders = headers.includes('question') || headers.includes('question_text') || headers.includes('prompt');
  
  const startIndex = hasHeaders ? 1 : 0;
  const questions = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length < 2) continue;

    if (hasHeaders) {
      const qText = cells[headers.indexOf('question')] || cells[headers.indexOf('question_text')] || cells[0] || '';
      const type = cells[headers.indexOf('type')] || cells[headers.indexOf('question_type')] || (cells.length >= 6 ? 'mcq' : 'short_answer');
      const optA = cells[headers.indexOf('option_a')] || cells[headers.indexOf('option a')] || cells[1] || '';
      const optB = cells[headers.indexOf('option_b')] || cells[headers.indexOf('option b')] || cells[2] || '';
      const optC = cells[headers.indexOf('option_c')] || cells[headers.indexOf('option c')] || cells[3] || '';
      const optD = cells[headers.indexOf('option_d')] || cells[headers.indexOf('option d')] || cells[4] || '';
      const correct = cells[headers.indexOf('correct_answer')] || cells[headers.indexOf('answer')] || cells[5] || '';
      const points = parseInt(cells[headers.indexOf('points')] || cells[6]) || 1;

      const options = [optA, optB, optC, optD].filter(Boolean);

      questions.push({
        question_text: qText,
        question_type: ['mcq', 'short_answer', 'project'].includes(type.toLowerCase()) ? type.toLowerCase() : (options.length > 1 ? 'mcq' : 'short_answer'),
        options: options.length > 1 ? options : null,
        correct_answer: correct,
        points,
        order_index: questions.length
      });
    } else {
      // Default CSV format: Question, Option A, Option B, Option C, Option D, Correct Answer, Points
      const qText = cells[0];
      if (!qText) continue;

      if (cells.length >= 6) {
        const options = [cells[1], cells[2], cells[3], cells[4]].filter(Boolean);
        const correct = cells[5] || options[0];
        const points = parseInt(cells[6]) || 1;

        questions.push({
          question_text: qText,
          question_type: 'mcq',
          options,
          correct_answer: correct,
          points,
          order_index: questions.length
        });
      } else {
        // Short Answer format: Question, Correct Answer, Points
        const correct = cells[1] || '';
        const points = parseInt(cells[2]) || 1;

        questions.push({
          question_text: qText,
          question_type: 'short_answer',
          options: null,
          correct_answer: correct,
          points,
          order_index: questions.length
        });
      }
    }
  }

  return questions.filter(q => q.question_text?.length > 0);
}

export function parsePlainText(content) {
  const blocks = content.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const questions = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let qText = '';
    const options = [];
    let correct_answer = null;
    let points = 1;
    let type = 'short_answer';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match Answer line (e.g. Answer: B or Correct: MongoDB)
      const ansMatch = line.match(/^(?:Answer|Correct|Key|Correct Answer):\s*(.+)$/i);
      if (ansMatch) {
        correct_answer = ansMatch[1].trim();
        continue;
      }

      // Match Points line (e.g. Points: 2 or Marks: 5)
      const ptsMatch = line.match(/^(?:Points|Marks|Score):\s*(\d+)$/i);
      if (ptsMatch) {
        points = parseInt(ptsMatch[1]) || 1;
        continue;
      }

      // Match MCQ Option (e.g. A) React or 1. Express or [A] Node)
      const optMatch = line.match(/^(?:[A-Da-d0-9][\.\)\:\]\-]|\[[A-Da-d]\])\s*(.+)$/);
      if (optMatch) {
        options.push(optMatch[1].trim());
        type = 'mcq';
        continue;
      }

      // Question line (e.g. 1. What is... or just text)
      if (!qText) {
        qText = line.replace(/^\d+[\.\)\:\-]\s*/, '').trim();
      } else {
        qText += ' ' + line;
      }
    }

    if (options.length > 1) {
      type = 'mcq';
      // If correct answer is a letter like 'A' or 'B'
      if (correct_answer && /^[A-Da-d]$/.test(correct_answer)) {
        const charCode = correct_answer.toUpperCase().charCodeAt(0) - 65;
        if (options[charCode]) {
          correct_answer = options[charCode];
        }
      }
    }

    if (qText) {
      questions.push({
        question_text: qText,
        question_type: type,
        options: options.length > 1 ? options : null,
        correct_answer: correct_answer || (options.length > 0 ? options[0] : ''),
        points,
        order_index: questions.length
      });
    }
  }

  return questions;
}

/**
 * Auto-detect and parse format (JSON, CSV, or Text)
 */
export function autoDetectAndParse(content) {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return parseJSON(trimmed);
    } catch {
      // Fallback to text
    }
  }

  // Try CSV if commas and header keywords exist
  const firstLine = trimmed.split('\n')[0] || '';
  if (firstLine.includes(',') && (firstLine.includes('question') || firstLine.split(',').length >= 3)) {
    try {
      const csvRes = parseCSV(trimmed);
      if (csvRes.length > 0) return csvRes;
    } catch {
      // Fallback to text
    }
  }

  // Parse as structured plain text
  return parsePlainText(trimmed);
}
