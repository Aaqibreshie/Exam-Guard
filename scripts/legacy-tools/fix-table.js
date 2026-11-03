const fs = require('fs');

const path = 'app/dashboard/student/profile/page.js';
let content = fs.readFileSync(path, 'utf8');

// Slice submissions to 5 max
content = content.replace("<tbody>\n                    {submissions.map((sub) => {", "<tbody>\n                    {submissions.slice(0, 5).map((sub) => {");

// Add a "View All" button at the bottom of the card
const viewAllBtn = `
              </div>
            )}
            
            {submissions.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <Link href="/dashboard/student/results" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
                  View All {submissions.length} Exams →
                </Link>
              </div>
            )}
          </div>
`;

content = content.replace(/<\/div>\s*\)\}\s*<\/div>/, viewAllBtn.trim());

// Rename "Exam History" to "Recent Exams"
content = content.replace(">\\s*Exam History\\s*</h3>", ">\n              Recent Exams\n            </h3>");

fs.writeFileSync(path, content);
