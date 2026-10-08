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
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 3v5h5M12 18v-6M9 15h6"/>
            </svg>
            Create New Examination
          </h1>
          <p className="dashboard-subtitle" style={{ marginTop: '4px' }}>Configure exam format, time limits, and evaluation mode</p>
        </div>
        <Link href="/dashboard/teacher" className="btn btn-ghost" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back
        </Link>
      </div>
      
      <div className="glass-card-static" style={{ padding: '36px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: '16px' }}>
        {error && (
          <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Exam Format Selector */}
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              Examination Format & Assessment Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {[
                { id: 'coding', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, title: 'Live Coding Practical', desc: 'In-browser IDE, test cases & auto-execution' },
                { id: 'hybrid', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, title: 'Hybrid Assessment', desc: 'Combined Theory MCQs & Coding challenges' },
                { id: 'mcq', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>, title: 'Theory & MCQs', desc: 'Multiple-choice and short answer questions' }
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
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: examFormat === f.id ? '#f0fdf4' : '#ffffff',
                    border: `2px solid ${examFormat === f.id ? '#10b981' : '#e2e8f0'}`,
                    boxShadow: examFormat === f.id ? '0 4px 12px rgba(16,185,129,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ 
                        padding: '6px', 
                        borderRadius: '8px', 
                        background: examFormat === f.id ? '#10b98120' : '#f1f5f9',
                        color: examFormat === f.id ? '#059669' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {f.icon}
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: examFormat === f.id ? '#065f46' : '#0f172a' }}>{f.title}</strong>
                    </div>
                    <div>
                      {f.id === examFormat ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981" stroke="#10b981" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="#fff" stroke="#fff"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: examFormat === f.id ? '#047857' : '#64748b', lineHeight: '1.4' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              Examination Title
            </label>
            <input 
              id="title"
              type="text" 
              required 
              placeholder="e.g. JavaScript Coding Assessment or MERN Stack Midterm"
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="description" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="3" x2="21" y2="7"></line><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line><line x1="9" y1="9" x2="11" y2="9"></line></svg>
              Description & Guidelines
            </label>
            <textarea 
              id="description"
              required 
              placeholder="Provide instructions, topics covered, and evaluation criteria..."
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="form-textarea"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label htmlFor="subject" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                Subject / Tech Stack
              </label>
              <input 
                id="subject"
                type="text"
                placeholder="e.g. React, Data Science, Python"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="form-input"
                required
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="duration" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Duration (Minutes)
              </label>
              <input 
                id="duration"
                type="number" 
                required 
                min="1"
                placeholder="60"
                value={durationMinutes} 
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="form-input"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label htmlFor="startTime" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Start Window (Optional)
              </label>
              <input 
                id="startTime"
                type="datetime-local" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endTime" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                End Window (Optional)
              </label>
              <input 
                id="endTime"
                type="datetime-local" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label htmlFor="passcode" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Exam Passcode (Optional)
              </label>
              <input 
                id="passcode"
                type="text" 
                placeholder="e.g. 8421"
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                className="form-input"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                If set, students must enter this PIN to start the exam.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label htmlFor="maxWarnings" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Max Anti-Cheat Warnings Allowed
            </label>
            <input 
              id="maxWarnings"
              type="number" 
              required 
              min="0"
              value={maxWarnings} 
              onChange={(e) => setMaxWarnings(e.target.value)}
              className="form-input"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', padding: '12px 16px' }}
            />
            <span style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
              Number of tab-switches or suspicious events before auto-expulsion (default: 3).
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: '16px', padding: '16px', fontSize: '1.05rem', fontWeight: 700, borderRadius: '12px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                <span>Creating Exam...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span>Proceed to Add Questions</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
