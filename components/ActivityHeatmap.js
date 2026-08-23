'use client';
import { useMemo } from 'react';

export default function ActivityHeatmap({ activityData = [] }) {
  // activityData: array of date strings 'YYYY-MM-DD'
  
  const heatmap = useMemo(() => {
    const today = new Date();
    // Start 12 weeks ago (approx 3 months)
    const startDate = new Date();
    startDate.setDate(today.getDate() - (12 * 7));
    
    // Create map of counts
    const counts = {};
    activityData.forEach(d => {
      const dateStr = new Date(d).toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    const weeks = [];
    let currentDay = new Date(startDate);
    
    for (let w = 0; w < 13; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        if (currentDay > today) break;
        
        const dStr = currentDay.toISOString().split('T')[0];
        const count = counts[dStr] || 0;
        
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 4) level = 3;
        if (count > 7) level = 4;
        
        week.push({ date: dStr, count, level });
        currentDay.setDate(currentDay.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  }, [activityData]);

  const getColor = (level) => {
    switch(level) {
      case 1: return '#dcfce7';
      case 2: return '#86efac';
      case 3: return '#22c55e';
      case 4: return '#16a34a';
      default: return '#f1f5f9';
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '12px', fontWeight: 600 }}>Activity Heatmap (Last 3 Months)</h4>
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
        {heatmap.map((week, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {week.map((day, j) => (
              <div 
                key={j} 
                title={`${day.count} activities on ${day.date}`}
                style={{ 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '3px',
                  background: getColor(day.level),
                  border: '1px solid rgba(27, 31, 35, 0.06)'
                }} 
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
        <span>Less</span>
        <div style={{ width: '12px', height: '12px', background: '#f1f5f9', borderRadius: '2px' }}></div>
        <div style={{ width: '12px', height: '12px', background: '#dcfce7', borderRadius: '2px' }}></div>
        <div style={{ width: '12px', height: '12px', background: '#86efac', borderRadius: '2px' }}></div>
        <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }}></div>
        <div style={{ width: '12px', height: '12px', background: '#16a34a', borderRadius: '2px' }}></div>
        <span>More</span>
      </div>
    </div>
  );
}
