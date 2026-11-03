const fs = require('fs');
let content = fs.readFileSync('lib/question-parser.js', 'utf8');

const newParseJSON = `
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
    throw new Error(\`Invalid JSON format: \${err.message}\`);
  }
}
`;

content = content.replace(/export function parseJSON[\s\S]*?\}\n\nexport function parseCSV/, newParseJSON.trim() + '\n\nexport function parseCSV');
fs.writeFileSync('lib/question-parser.js', content);
