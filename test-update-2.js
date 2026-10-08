const fs = require('fs');
const content = `
import { createClient } from '@/lib/supabase/client';

export default function TestUpdate() {
  const supabase = createClient();
  const testUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // fetch one question
    const { data: qList } = await supabase.from('question_bank').select('*').eq('created_by', user.id).limit(1);
    if (!qList || qList.length === 0) return alert('No questions found');
    
    const q = qList[0];
    const oldSubject = q.subject;
    
    // update subject
    const { data, error } = await supabase.from('question_bank').update({ subject: 'html_test' }).eq('id', q.id).select();
    
    alert('Update returned: ' + JSON.stringify(data) + ' error: ' + error);
  }
  
  return <button onClick={testUpdate}>Test Update</button>;
}
`;
fs.writeFileSync('app/dashboard/teacher/test-update/page.js', content);
