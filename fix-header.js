const fs = require('fs');

const path = 'components/ActivityHeatmap.js';
let content = fs.readFileSync(path, 'utf8');

const oldHeader = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <div>
          <h4 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>Activity Hive</h4>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Track your mastery progression</p>
        </div>
        
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🔥 {currentStreak}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Day Streak</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(to right, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LVL {level}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{totalXP} XP Total</div>
          </div>
        </div>
      </div>`;

const newHeader = `<div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', position: 'relative', zIndex: 10, flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>Activity Hive</h4>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Track your mastery progression</p>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div style={{ fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1.1rem', WebkitTextFillColor: 'initial' }}>🔥</span> {currentStreak}
             </div>
             <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: '2px' }}>Day Streak</div>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(to right, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LVL {level}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: '2px' }}>{totalXP} XP Total</div>
          </div>

        </div>
      </div>`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(path, content);
