'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubjectStyling } from '@/lib/subject-helpers';

export default function BankImportModal({ examId, examSubject, onImportSuccess, onCancel }) {
  const supabase = createClient();
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [filterSubject, setFilterSubject] = useState(examSubject || '');

  useEffect(() => {
    fetchBank();
  }, []);

  const fetchBank = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBankQuestions(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      const selectedQuestions = bankQuestions.filter(q => selectedIds.has(q.id));
      
      const toInsert = selectedQuestions.map((q, index) => ({
        exam_id: examId,
        question: q.question,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        starter_code: q.starter_code,
        test_cases: q.test_cases,
        order_index: 999 // Put them at the end
      }));

      const { data, error } = await supabase
        .from('questions')
        .insert(toInsert)
        .select();
        
      if (error) throw error;
      
      if (onImportSuccess) onImportSuccess(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const filtered = bankQuestions.filter(q => !filterSubject || (q.subject || '').toLowerCase().includes(filterSubject.toLowerCase()));

  return (
    <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>📂 Import from Question Bank</h3>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          placeholder="Filter by Subject (e.g. MERN, Git, Data Science)" 
          className="form-input"
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>

      {loading ? (
        <p>Loading Question Bank...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#64748b' }}>No questions found in the bank matching this subject.</p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {filtered.map(q => {
            const isSelected = selectedIds.has(q.id);
            const style = getSubjectStyling(q.subject);
            return (
              <div 
                key={q.id} 
                onClick={() => toggleSelect(q.id)}
                style={{ 
                  padding: '16px', 
                  background: '#ffffff', 
                  borderRadius: '12px', 
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <input type="checkbox" checked={isSelected} readOnly style={{ marginTop: '4px' }} />
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge-subject" style={{ background: style.bg, color: style.color, borderColor: style.border, padding: '2px 6px', fontSize: '0.7rem' }}>
                      {style.label}
                    </span>
                    <span className="badge-subject" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', padding: '2px 6px', fontSize: '0.7rem' }}>
                      {q.question_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.points} pts</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#1e293b', margin: 0 }}>{q.question}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={handleImport}
        disabled={selectedIds.size === 0 || importing}
      >
        {importing ? 'Importing...' : `Import ${selectedIds.size} Question${selectedIds.size !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
