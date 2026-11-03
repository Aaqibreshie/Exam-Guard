const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');

const darkTheme = `

/* ==========================================================================
   Dark Mode Theme
   ========================================================================== */
.dark {
  /* Surface & Background Palette */
  --bg-app: #020617;
  --bg-surface: #0f172a;
  --bg-surface-raised: #1e293b;
  --bg-card: #0f172a;
  --bg-card-hover: #1e293b;
  --bg-glass: rgba(15, 23, 42, 0.7);
  --bg-glass-strong: rgba(15, 23, 42, 0.95);
  
  /* Borders */
  --border-subtle: #1e293b;
  --border-glass: #334155;
  --border-glow: rgba(5, 150, 105, 0.4);
  
  /* Typography Colors */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-inverse: #0f172a;

  /* Primary Brand Accents (Emerald / Mint Green & Deep Slate Teal) */
  --primary-light: rgba(5, 150, 105, 0.15);
  --accent-cyan-light: rgba(2, 132, 199, 0.15);
  --accent-purple-light: rgba(124, 58, 237, 0.15);
  --accent-emerald-light: rgba(16, 185, 129, 0.15);
  --accent-amber-light: rgba(217, 119, 6, 0.15);
  --accent-red-light: rgba(225, 29, 72, 0.15);

  /* Gradients */
  --grad-dark: linear-gradient(180deg, #0f172a 0%, #020617 100%);

  /* Clean Modern Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 4px 10px -2px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 40px -8px rgba(0, 0, 0, 0.6);
}
`;

content = content.replace("/* ==========================================================================\n", darkTheme + "\n/* ==========================================================================\n");

fs.writeFileSync('app/globals.css', content);
