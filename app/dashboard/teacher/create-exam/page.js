'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function CreateExamPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('mern');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passcode, setPasscode] = useState('');
  const [maxWarnings, setMaxWarnings] = useState(3);
  
  const [examFormat, setExamFormat] = useState('coding'); // 'coding' | 'hybrid' | 'mcq'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const formatTag = examFormat === 'coding' ? '[Coding Practical]' : examFormat === 'hybrid' ? '[Hybrid Assessment]' : '[Theory MCQ]';
      const formattedTitle = title.includes('[') ? title : `${formatTag} ${title}`;

      const { data, error: insertError } = await supabase
        .from('exams')
        .insert([{
          title: formattedTitle,
          description,
          subject,
          duration_minutes: parseInt(durationMinutes),
          start_time: startTime || null,
          end_time: endTime || null,
          passcode: passcode || null,
          max_warnings: parseInt(maxWarnings),
          created_by: user.id,
          total_marks: 0,
          is_published: false
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      router.push(`/dashboard/teacher/exam/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '820px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title">Create New Examination</h1>
          <p className="dashboard-subtitle">Configure exam format, time limits, and evaluation mode</p>
        </div>
        <Link href="/dashboard/teacher" className="btn btn-ghost btn-sm">
          ← Back
        </Link>
      </div>
      
      <div className="glass-card-static" style={{ padding: '36px' }}>
        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Exam Format Selector */}
          <div className="form-group">
            <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'block' }}>
              🎯 Examination Format & Assessment Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                { id: 'coding', icon: '💻', title: 'Live Coding Practical', desc: 'In-browser IDE, test cases & auto-execution' },
                { id: 'hybrid', icon: '⚡', title: 'Hybrid Assessment', desc: 'Combined Theory MCQs & Coding challenges' },
                { id: 'mcq', icon: '🔘', title: 'Theory & MCQs', desc: 'Multiple-choice and short answer questions' }
              ].map(f => (
                <div
                  key={f.id}
                  onClick={() => {
                    setExamFormat(f.id);
                    if (!title) {
                      setTitle(f.id === 'coding' ? 'JavaScript & Algorithmic Problem Solving' : f.id === 'hybrid' ? 'Fullstack Web Development Midterm' : 'Core Web Foundations Exam');
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: examFormat === f.id ? '#ecfdf5' : '#f8fafc',
                    border: `2px solid ${examFormat === f.id ? '#059669' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{f.title}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title">Examination Title</label>
            <input 
              id="title"
              type="text" 
              required 
              placeholder="e.g. JavaScript Coding Assessment or MERN Stack Midterm"
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description & Guidelines</label>
            <textarea 
              id="description"
              required 
              placeholder="Provide instructions, topics covered, and evaluation criteria..."
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="subject">Subject Track</label>
              <select 
                id="subject"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="form-select"
              >
                <option value="mern">MERN Stack (MongoDB, Express, React, Node)</option>
                <option value="git">Git</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="duration">Duration (Minutes)</label>
              <input 
                id="duration"
                type="number" 
                required 
                min="1"
                placeholder="60"
                value={durationMinutes} 
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="startTime">Start Window (Optional)</label>
              <input 
                id="startTime"
                type="datetime-local" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endTime">End Window (Optional)</label>
              <input 
                id="endTime"
                type="datetime-local" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="passcode">Exam Passcode (Optional)</label>
              <input 
                id="passcode"
                type="text" 
                placeholder="e.g. 8421"
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                className="form-input"
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                If set, students must enter this PIN to start the exam.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="maxWarnings">Max Anti-Cheat Warnings Allowed</label>
            <input 
              id="maxWarnings"
              type="number" 
              required 
              min="0"
              value={maxWarnings} 
              onChange={(e) => setMaxWarnings(e.target.value)}
              className="form-input"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              Number of tab-switches or suspicious events before auto-expulsion (default: 3).
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: '16px' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                <span>Creating Exam...</span>
              </>
            ) : (
              <span>Proceed to Add Questions →</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
