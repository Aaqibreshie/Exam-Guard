'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';

export default function TeacherAnalytics({ examStats = [], questionStats = [] }) {
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
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
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
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${value}% Success Rate`, 'Performance']}
                  />
                  <Bar dataKey="successRate" radius={[0, 4, 4, 0]} barSize={20}>
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
