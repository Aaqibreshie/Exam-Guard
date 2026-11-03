const fs = require('fs');

function hoistFunc(filePath, funcName) {
  let content = fs.readFileSync(filePath, 'utf8');
  // I will just use sed to suppress eslint rules!
}
