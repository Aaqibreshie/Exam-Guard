const fs = require('fs');
let content = fs.readFileSync('lib/question-parser.js', 'utf8');

// Replace parseJSON function to handle object options
const newParseJSON = `
export function parseJSON(content) {
  try {
    const data = JSON.parse(content);
    const list = Array.isArray(data) ? data : (data.questions || [data]);
    
    return list.map((item, index) => {
      const qText = item.question || item.question_text || item.text || '';
      const qType = item.type || item.question_type || (item.options ? 'mcq' : 'short_answer');
      
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

content = content.replace(/export function parseJSON[\s\S]*?\}\n/, newParseJSON.trim() + '\n');
fs.writeFileSync('lib/question-parser.js', content);
