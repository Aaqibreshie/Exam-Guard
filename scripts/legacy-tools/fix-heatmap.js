const fs = require('fs');
let content = fs.readFileSync('components/ActivityHeatmap.js', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('components/ActivityHeatmap.js', content);
