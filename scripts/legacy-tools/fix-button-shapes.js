const fs = require('fs');

let qb = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

qb = qb.replace(
  `<div key={q.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>`,
  `<div key={q.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`
);

qb = qb.replace(
  `<div style={{ display: 'flex', gap: '8px' }}>\n                  <button onClick={() => startEdit(q)} className="btn btn-ghost" title="Edit" style={{ color: '#64748b', transition: 'color 0.2s', padding: '8px' }}`,
  `<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>\n                  <button onClick={() => startEdit(q)} className="btn btn-ghost" title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '8px', color: '#64748b', transition: 'all 0.2s' }}`
);

qb = qb.replace(
  `<button onClick={() => handleDelete(q.id)} className="btn btn-ghost" title="Delete" style={{ color: '#64748b', transition: 'color 0.2s', padding: '8px' }}`,
  `<button onClick={() => handleDelete(q.id)} className="btn btn-ghost" title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '8px', color: '#64748b', transition: 'all 0.2s' }}`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', qb);
