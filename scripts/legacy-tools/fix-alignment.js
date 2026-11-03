const fs = require('fs');

const path = 'components/ActivityHeatmap.js';
let content = fs.readFileSync(path, 'utf8');

// Replace flex-start with center
content = content.replace("alignItems: 'flex-start'", "alignItems: 'center'");

fs.writeFileSync(path, content);
