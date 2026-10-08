const fs = require('fs');
const path = 'app/dashboard/student/profile/page.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Import Heatmap
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport ActivityHeatmap from '@/components/ActivityHeatmap';");

// 2. Add activityData state
content = content.replace("const [submissions, setSubmissions] = useState([]);", "const [submissions, setSubmissions] = useState([]);\n  const [activityData, setActivityData] = useState([]);");

// 3. Fetch practice_attempts and merge with submissions for activity dates
const fetchLogic = `
      if (subs) {
        setSubmissions(subs);
        
        // Also fetch practice attempts for heatmap
        const { data: practice } = await supabase
          .from('practice_attempts')
          .select('created_at')
          .eq('student_id', user.id);
          
        const dates = [];
        subs.forEach(s => dates.push(s.started_at));
        if (practice) {
          practice.forEach(p => dates.push(p.created_at));
        }
        setActivityData(dates);
      }
`;

content = content.replace(`
      if (subs) {
        setSubmissions(subs);
      }
`.trim(), fetchLogic.trim());

// 4. Render Heatmap under Account Settings or under Quick Stats
const heatmapJSX = `
          {/* Heatmap Card */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <ActivityHeatmap activityData={activityData} />
          </div>

          {/* Exam History */}
`;

content = content.replace("{/* Exam History */}", heatmapJSX.trim());

fs.writeFileSync(path, content);
