const fs = require('fs');

const path = 'components/ActivityHeatmap.js';
let content = fs.readFileSync(path, 'utf8');

// Function for text colors
const getTextColor = `
  const getTextColor = (level) => {
    switch(level) {
      case 1: return '#34d399';
      case 2: return '#fbbf24';
      case 3: return '#f472b6';
      case 4: return '#a78bfa';
      default: return '#94a3b8';
    }
  };
`;

content = content.replace("const getGlow =", getTextColor + "\n  const getGlow =");

// Fix the tooltip text
const badTooltip = "background: getColor(hoveredDay.level > 0 ? hoveredDay.level : 1), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'";
const goodTooltip = "color: getTextColor(hoveredDay.level)";

content = content.replace(badTooltip, goodTooltip);

// Fix 0 activities tooltip
content = content.replace("Earned on {hoveredDay.date}", "{hoveredDay.count === 0 ? 'No activity on' : 'Earned on'} {hoveredDay.date}");

// Add backgroundClip standard property just in case we ever use gradients again, though we removed it here.

fs.writeFileSync(path, content);
