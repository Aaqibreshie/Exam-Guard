const fs = require('fs');
let content = fs.readFileSync('app/layout.js', 'utf8');

if (!content.includes('ThemeProvider')) {
  content = content.replace("import './globals.css';", "import './globals.css';\nimport ThemeProvider from '@/components/ThemeProvider';");
  
  content = content.replace("<body className={inter.className}>", "<body className={inter.className}>\n        <ThemeProvider attribute=\"class\" defaultTheme=\"system\" enableSystem>");
  
  content = content.replace("</body>", "        </ThemeProvider>\n      </body>");
  
  // also add suppressHydrationWarning to html tag
  content = content.replace("<html lang=\"en\">", "<html lang=\"en\" suppressHydrationWarning>");
  
  fs.writeFileSync('app/layout.js', content);
}
