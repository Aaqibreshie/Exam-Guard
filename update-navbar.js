const fs = require('fs');
let content = fs.readFileSync('components/Navbar.js', 'utf8');

const targetStr = '<button onClick={handleLogout}';
const replacementStr = '<ThemeToggle />\n        <button onClick={handleLogout}';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('components/Navbar.js', content);
}
