'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';

export default function TeacherAnalytics({ examStats = [], questionStats = [] }) {

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

  if (examStats.length === 0) return null;

  return (
    <div style={{ marginTop: '32px', marginBottom: '32px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '20px' }}>Advanced Analytics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Exam Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card-static" 
          style={{ padding: '24px', background: '#0f172a', border: '1px solid #1e293b' }}
        >
          <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '8px', fontWeight: 700 }}>Class Averages</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>Average score per exam across all students</p>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomExamTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="average" radius={[4, 4, 0, 0]} minPointSize={5} label={{ position: 'top', fill: '#94a3b8', fontSize: 12, formatter: (val) => val + '%' }}>
                  {examStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.average >= 70 ? '#10b981' : (entry.average >= 50 ? '#f59e0b' : '#ef4444')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Question Difficulty Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card-static" 
          style={{ padding: '24px', background: '#0f172a', border: '1px solid #1e293b' }}
        >
          <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '8px', fontWeight: 700 }}>Question Difficulty</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>Identify which topics students struggle with most</p>
          
          {questionStats.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionStats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis dataKey="shortName" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<CustomQuestionTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="successRate" radius={[0, 4, 4, 0]} barSize={20} minPointSize={5} label={{ position: 'right', fill: '#94a3b8', fontSize: 12, formatter: (val) => val + '%' }}>
                    {questionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.successRate >= 70 ? '#10b981' : (entry.successRate >= 50 ? '#f59e0b' : '#ef4444')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              Not enough detailed question data yet.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
