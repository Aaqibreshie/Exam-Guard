'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityHeatmap({ activityData = [] }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const { heatmap, totalXP, level, currentStreak } = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (8 * 7)); // Last 8 weeks for a denser hive
    
    const counts = {};
    let total = 0;
    activityData.forEach(d => {
      const dateStr = new Date(d).toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
      total++;
    });

    // Calculate XP and Level
    const totalXP = total * 150; 
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;

    // Calculate Streak
    let currentStreak = 0;
    let tempDate = new Date();
    while (true) {
      const dStr = tempDate.toISOString().split('T')[0];
      if (counts[dStr] && counts[dStr] > 0) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        if (currentStreak === 0 && tempDate.toDateString() === new Date().toDateString()) {
          // If today is empty, check yesterday before breaking streak
          tempDate.setDate(tempDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const weeks = [];
    let currentDay = new Date(startDate);
    
    for (let w = 0; w < 9; w++) {
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
    return { heatmap: weeks, totalXP, level, currentStreak };
  }, [activityData]);

  const getColor = (level) => {
    switch(level) {
      case 1: return 'linear-gradient(135deg, #34d399, #059669)';
      case 2: return 'linear-gradient(135deg, #fbbf24, #d97706)';
      case 3: return 'linear-gradient(135deg, #f472b6, #db2777)';
      case 4: return 'linear-gradient(135deg, #a78bfa, #7c3aed)';
      default: return '#1e293b';
    }
  };

  
  const getTextColor = (level) => {
    switch(level) {
      case 1: return '#34d399';
      case 2: return '#fbbf24';
      case 3: return '#f472b6';
      case 4: return '#a78bfa';
      default: return '#94a3b8';
    }
  };

  const getGlow = (level) => {
    switch(level) {
      case 1: return '0 0 10px rgba(52, 211, 153, 0.4)';
      case 2: return '0 0 12px rgba(251, 191, 36, 0.5)';
      case 3: return '0 0 15px rgba(244, 114, 182, 0.6)';
      case 4: return '0 0 20px rgba(167, 139, 250, 0.8)';
      default: return 'none';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0, rotate: -90 },
    show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } }
  };

  return (
    <div style={{ marginTop: '24px', background: '#0f172a', borderRadius: '24px', padding: '32px', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-50%', right: '-20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
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
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '20px', position: 'relative', zIndex: 10, justifyContent: 'center' }}
      >
        {heatmap.map((week, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: i % 2 === 0 ? '12px' : '0' }}>
            {week.map((day, j) => (
              <motion.div 
                key={j} 
                variants={itemVariants}
                whileHover={{ scale: 1.5, zIndex: 50, rotate: 30 }}
                onMouseEnter={() => setHoveredDay({ ...day, weekIndex: i, dayIndex: j })}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: day.level === 0 ? '#1e293b' : getColor(day.level),
                  boxShadow: getGlow(day.level),
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  cursor: 'crosshair',
                  position: 'relative'
                }} 
              />
            ))}
          </div>
        ))}
      </motion.div>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '16px 24px',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 600,
              pointerEvents: 'none',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              zIndex: 100
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '4px', color: getTextColor(hoveredDay.level) }}>
              +{hoveredDay.count * 150} XP
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{hoveredDay.count === 0 ? 'No activity on' : 'Earned on'} {hoveredDay.date}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
