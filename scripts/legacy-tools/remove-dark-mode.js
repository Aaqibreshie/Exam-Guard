const fs = require('fs');

// 1. Remove from Navbar
let navbar = fs.readFileSync('components/Navbar.js', 'utf8');
navbar = navbar.replace("import ThemeToggle from '@/components/ThemeToggle';\n", "");
navbar = navbar.replace("<ThemeToggle />\n        ", "");
fs.writeFileSync('components/Navbar.js', navbar);

// 2. Remove from layout
let layout = fs.readFileSync('app/layout.js', 'utf8');
layout = layout.replace("import ThemeProvider from '@/components/ThemeProvider';\n", "");
layout = layout.replace("<ThemeProvider attribute=\"class\" defaultTheme=\"system\" enableSystem>", "");
layout = layout.replace("</ThemeProvider>\n      ", "");
layout = layout.replace(" suppressHydrationWarning", "");
fs.writeFileSync('app/layout.js', layout);

// 3. Remove from globals.css
let css = fs.readFileSync('app/globals.css', 'utf8');
const darkRegex = /\/\* ==========================================================================\n   Dark Mode Theme\n   ========================================================================== \*\/\n\.dark {[\s\S]*?}/;
css = css.replace(darkRegex, "");
fs.writeFileSync('app/globals.css', css);

