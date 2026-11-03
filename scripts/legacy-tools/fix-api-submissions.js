const fs = require('fs');
let c = fs.readFileSync('app/api/submissions/route.js', 'utf8');

const oldLogic = `      if (answerInserts.length > 0) {
        await supabase.from('answers').insert(answerInserts)
      }`;

const newLogic = `      if (answerInserts.length > 0) {
        // Fetch existing answers to safely update or insert
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('id, question_id')
          .eq('submission_id', submission_id);

        const existingMap = new Map();
        if (existingAnswers) {
          existingAnswers.forEach(ans => existingMap.set(ans.question_id, ans.id));
        }

        for (const ans of answerInserts) {
          if (existingMap.has(ans.question_id)) {
            // UPDATE
            await supabase.from('answers').update(ans).eq('id', existingMap.get(ans.question_id));
          } else {
            // INSERT
            await supabase.from('answers').insert(ans);
          }
        }
      }`;

c = c.replace(oldLogic, newLogic);
fs.writeFileSync('app/api/submissions/route.js', c);
