const fs = require('fs');
let content = fs.readFileSync('lib/question-parser.js', 'utf8');

// The file currently has the new parseJSON, followed by a trailing broken block.
// Let's remove the broken block starting from line 51 to 63.
// We can just use string replacement or regex.

const brokenBlock = \`      return {
        question_text: qText.trim(),
        question_type: ['mcq', 'short_answer', 'project'].includes(qType) ? qType : 'mcq',
        options,
        correct_answer: correct ? String(correct).trim() : null,
        points: parseInt(item.points) || 1,
        order_index: index
      };
    }).filter(q => q.question_text.length > 0);
  } catch (err) {
    throw new Error(\\\`Invalid JSON format: \\\${err.message}\\\`);
  }
}
\`;

content = content.replace(brokenBlock, "");
fs.writeFileSync('lib/question-parser.js', content);
