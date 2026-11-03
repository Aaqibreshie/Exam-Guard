const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');

// Extract the .dark block
const darkRegex = /\/\* ==========================================================================\n   Dark Mode Theme\n   ========================================================================== \*\/\n\.dark {[\s\S]*?}/;

const match = content.match(darkRegex);
if (match) {
  const darkBlock = match[0];
  content = content.replace(darkBlock, ''); // remove it from the top
  
  // Find the end of :root { ... }
  const rootRegex = /:root {[\s\S]*?}/;
  const rootMatch = content.match(rootRegex);
  
  if (rootMatch) {
    const rootBlock = rootMatch[0];
    content = content.replace(rootBlock, rootBlock + '\n\n' + darkBlock);
  }
  
  fs.writeFileSync('app/globals.css', content);
}

