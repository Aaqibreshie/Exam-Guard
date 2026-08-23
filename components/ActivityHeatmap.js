'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityHeatmap({ activityData = [] }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const heatmap = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (12 * 7));
    
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.02 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }
  };

  return (
    <div style={{ marginTop: '24px', position: 'relative' }}>
      <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '16px', fontWeight: 700 }}>Contribution Graph</h4>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '12px' }}
      >
        {heatmap.map((week, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {week.map((day, j) => (
              <motion.div 
                key={j} 
                variants={itemVariants}
                whileHover={{ scale: 1.4, zIndex: 10, outline: '2px solid rgba(0,0,0,0.1)' }}
                onMouseEnter={() => setHoveredDay({ ...day, weekIndex: i, dayIndex: j })}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ 
                  width: '15px', 
                  height: '15px', 
                  borderRadius: '4px',
                  background: getColor(day.level),
                  cursor: 'pointer',
                  position: 'relative'
                }} 
              />
            ))}
          </div>
        ))}
      </motion.div>

      {/* Modern Floating Tooltip */}
      <AnimatePresence>
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '-40px',
              left: Math.min(hoveredDay.weekIndex * 20, 250) + 'px',
              background: '#0f172a',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              pointerEvents: 'none',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
              zIndex: 50
            }}
          >
            <span style={{ color: '#86efac' }}>{hoveredDay.count}</span> activities on {hoveredDay.date}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '20px',
              width: '8px',
              height: '8px',
              background: '#0f172a',
              transform: 'rotate(45deg)'
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b', marginTop: '12px', fontWeight: 500 }}>
        <span>Less</span>
        <div style={{ width: '14px', height: '14px', background: '#f1f5f9', borderRadius: '3px' }}></div>
        <div style={{ width: '14px', height: '14px', background: '#dcfce7', borderRadius: '3px' }}></div>
        <div style={{ width: '14px', height: '14px', background: '#86efac', borderRadius: '3px' }}></div>
        <div style={{ width: '14px', height: '14px', background: '#22c55e', borderRadius: '3px' }}></div>
        <div style={{ width: '14px', height: '14px', background: '#16a34a', borderRadius: '3px' }}></div>
        <span>More</span>
      </div>
    </div>
  );
}
