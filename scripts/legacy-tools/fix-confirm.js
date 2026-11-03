const fs = require('fs');

let c = fs.readFileSync('app/dashboard/teacher/exam/[id]/page.js', 'utf8');

c = c.replace(
  "  const [deleteLoading, setDeleteLoading] = useState(false);",
  "  const [deleteLoading, setDeleteLoading] = useState(false);\n  const [showDeleteModal, setShowDeleteModal] = useState(false);"
);

const oldHandleDelete = `  const handleDeleteExam = async () => {
    if (!confirm(\`Are you sure you want to remove "\${exam.title}"?\\n\\nThis will remove the exam from active listings while safely preserving historical student submissions and answer keys in student records.\`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          is_published: false,
          title: exam.title?.startsWith('[Archived]') ? exam.title : \`[Archived] \${exam.title}\`
        })
        .eq('id', id);

      if (error) throw error;
      router.push('/dashboard/teacher');
    } catch (err) {
      showNotification(err.message, 'error');
      setDeleteLoading(false);
    }
  };`;

const newHandleDelete = `  const handleDeleteExam = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteExam = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          is_published: false,
          title: exam.title?.startsWith('[Archived]') ? exam.title : \`[Archived] \${exam.title}\`
        })
        .eq('id', id);

      if (error) throw error;
      router.push('/dashboard/teacher');
    } catch (err) {
      showNotification(err.message, 'error');
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };`;

c = c.replace(oldHandleDelete, newHandleDelete);

const deleteModalJSX = `
      {/* Delete Exam Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s ease-out'
          }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Archive Examination</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to remove <strong style={{color:'#0f172a'}}>"{exam?.title}"</strong>? 
              <br/><br/>
              This will remove the exam from active listings while safely preserving historical student submissions and answer keys in student records.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost"
                style={{ padding: '10px 20px', fontWeight: 600, color: '#475569', background: '#f1f5f9' }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteExam}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontWeight: 600, background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Archiving...' : 'Yes, Archive Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

c = c.replace("    </div>\n  );\n}", deleteModalJSX);

fs.writeFileSync('app/dashboard/teacher/exam/[id]/page.js', c);
