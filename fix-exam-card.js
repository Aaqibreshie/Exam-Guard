const fs = require('fs');

let c = fs.readFileSync('components/ExamCard.js', 'utf8');

c = c.replace(
  "export default function ExamCard({ exam, role, href, onDeleted }) {",
  "export default function ExamCard({ exam, role, href, onDeleted }) {\n  const [showDeleteModal, setShowDeleteModal] = useState(false);"
);

c = c.replace(
  "  const handleDelete = async (e) => {\n    e.preventDefault();\n    e.stopPropagation();\n\n    if (!confirm(`Are you sure you want to remove \"${exam.title}\"?\\n\\nThis will remove the exam from active listings while preserving historical student scores and question answers in student records.`)) {\n      return;\n    }\n\n    setDeleting(true);\n    try {",
  "  const handleDeleteClick = (e) => {\n    e.preventDefault();\n    e.stopPropagation();\n    setShowDeleteModal(true);\n  };\n\n  const confirmDelete = async () => {\n    setDeleting(true);\n    try {"
);

c = c.replace(
  "      alert(`Failed to remove exam: ${err.message}`);\n      setDeleting(false);\n    }\n  };",
  "      alert(`Failed to remove exam: ${err.message}`);\n      setDeleting(false);\n      setShowDeleteModal(false);\n    }\n  };"
);

c = c.replace(
  "onClick={handleDelete}",
  "onClick={handleDeleteClick}"
);

c = c.replace(
  "<h3 className=\"exam-title\" style={{ marginTop: '12px' }}>{exam.title}</h3>",
  "<h3 className=\"exam-title\" style={{ marginTop: '12px' }}>{displayTitle}</h3>"
);

c = c.replace(
  "💻 Live Coding",
  "<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\"}}><polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline></svg> Live Coding"
);

c = c.replace(
  "⚡ Theory + Code",
  "<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\"}}><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"></polygon></svg> Theory + Code"
);

c = c.replace(
  "○ Draft",
  "<svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><circle cx=\"12\" cy=\"12\" r=\"10\"></circle></svg> Draft"
);

c = c.replace(
  "● Published",
  "<svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"currentColor\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\" style={{marginRight:\"4px\", display:\"inline-block\", verticalAlign:\"text-top\", marginTop:\"2px\"}}><circle cx=\"12\" cy=\"12\" r=\"10\"></circle></svg> Published"
);

c = c.replace(
  "🗑️ Delete",
  "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M3 6h18\"></path><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"></path><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"></path></svg> Delete"
);

c = c.replace(
  "<span>⏱️</span>",
  "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#64748b\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg>"
);

c = c.replace(
  "<span>🎯</span>",
  "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#64748b\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"6\"></circle><circle cx=\"12\" cy=\"12\" r=\"2\"></circle></svg>"
);

c = c.replace(
  "<span>🛡️</span>",
  "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#64748b\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path></svg>"
);

const oldReturn = `    </Link>\n  );\n}`;
const newReturn = `    </Link>\n\n    {showDeleteModal && (
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0'
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
            Are you sure you want to remove <strong style={{color:'#0f172a'}}>"{displayTitle}"</strong>? 
            <br/><br/>
            This will remove the exam from active listings while safely preserving historical student submissions and answer keys in student records.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteModal(false);
              }}
              className="btn btn-ghost"
              style={{ padding: '10px 20px', fontWeight: 600, color: '#475569', background: '#f1f5f9' }}
              disabled={deleting}
            >
              Cancel
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDelete();
              }}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontWeight: 600, background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
              disabled={deleting}
            >
              {deleting ? 'Archiving...' : 'Yes, Archive Exam'}
            </button>
          </div>
        </div>
      </div>
    )}\n    </>\n  );\n}`;

c = c.replace(`return (\n    <Link`, `return (\n    <>\n    <Link`);
c = c.replace(oldReturn, newReturn);

fs.writeFileSync('components/ExamCard.js', c);
