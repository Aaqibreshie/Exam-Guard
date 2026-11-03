const fs = require('fs');

// Fix Question Bank
let qb = fs.readFileSync('app/dashboard/teacher/question-bank/page.js', 'utf8');

qb = qb.replace(
  `{editingQuestion ? '✏️ Edit Question' : 'New Question'}`,
  `{editingQuestion ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> Edit Question</> : 'New Question'}`
);

qb = qb.replace(
  `✏️ Single Form`,
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> Single Form`
);

qb = qb.replace(
  `<button onClick={() => startEdit(q)} className="btn btn-ghost btn-sm" title="Edit">
                    ✏️
                  </button>`,
  `<button onClick={() => startEdit(q)} className="btn btn-ghost btn-sm" title="Edit" style={{ color: '#64748b', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#059669'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </button>`
);

qb = qb.replace(
  `<button onClick={() => handleDelete(q.id)} className="btn btn-ghost btn-sm" title="Delete">
                    🗑️
                  </button>`,
  `<button onClick={() => handleDelete(q.id)} className="btn btn-ghost btn-sm" title="Delete" style={{ color: '#64748b', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>`
);

fs.writeFileSync('app/dashboard/teacher/question-bank/page.js', qb);

// Fix Exam Builder
let ex = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

ex = ex.replace(
  `{deleteLoading ? 'Deleting Exam...' : '🗑️ Delete Exam'}`,
  `{deleteLoading ? 'Deleting Exam...' : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg> Delete Exam</>}`
);

const oldXButton = `                      onClick={() => handleDeleteQuestion(q.id, q.points)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                      title="Delete question"
                    >
                      ✕
                    </button>`;

const newXButton = `                      onClick={() => handleDeleteQuestion(q.id, q.points)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                      title="Delete question"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>`;

ex = ex.replace(oldXButton, newXButton);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', ex);
