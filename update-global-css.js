const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');

// Add hover effects to cards
content += `

/* ==========================================================================
   Modern Interactions
   ========================================================================== */
.glass-card {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  transform: translateY(-4px) scale(1.005);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
}

.btn {
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.btn:active {
  transform: scale(0.96);
}

.btn-primary:after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
  transform: translateX(-100%);
  transition: transform 0.5s ease-out;
}

.btn-primary:hover:after {
  transform: translateX(100%);
}

.table-row-hover tr {
  transition: background-color 0.15s ease;
}
.table-row-hover tr:hover {
  background-color: #f8fafc;
}
`;

fs.writeFileSync('app/globals.css', content);
