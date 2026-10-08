const fs = require('fs');
let content = fs.readFileSync('components/TeacherAnalytics.js', 'utf8');

const customTooltips = `
  const CustomExamTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#020617', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px', color: '#fff', maxWidth: '300px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.4' }}>{data.fullName || data.name}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Class Average:</span>
            <span style={{ color: payload[0].fill, fontWeight: 'bold', marginLeft: '12px' }}>{data.average}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            <span>Submissions:</span>
            <span>{data.submissions}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomQuestionTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#020617', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px', color: '#fff', maxWidth: '300px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word' }}>{data.fullName || data.shortName}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Success Rate:</span>
            <span style={{ color: payload[0].fill, fontWeight: 'bold', marginLeft: '12px' }}>{data.successRate}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            <span>Total Attempts:</span>
            <span>{data.total}</span>
          </div>
        </div>
      );
    }
    return null;
  };
`;

content = content.replace("  if (examStats.length === 0) return null;", customTooltips + "\n  if (examStats.length === 0) return null;");

content = content.replace(
  `<Tooltip \n                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}\n                  contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}\n                />`,
  `<Tooltip content={<CustomExamTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />`
);

content = content.replace(
  `<Tooltip \n                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}\n                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}\n                    formatter={(value) => [\`\${value}% Success Rate\`, 'Performance']}\n                  />`,
  `<Tooltip content={<CustomQuestionTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />`
);

fs.writeFileSync('components/TeacherAnalytics.js', content);
