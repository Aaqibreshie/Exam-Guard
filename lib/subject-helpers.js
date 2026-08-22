export function getSubjectStyling(subjectStr) {
  const s = (subjectStr || 'General').toLowerCase().trim();
  
  if (s.includes('mern') || s === 'web dev') {
    return {
      label: '⚡ MERN',
      bg: '#e0f2fe',
      color: '#0284c7',
      border: '#bae6fd'
    };
  }
  
  if (s.includes('git')) {
    return {
      label: '🐙 GIT',
      bg: '#f5f3ff',
      color: '#7c3aed',
      border: '#ddd6fe'
    };
  }
  
  if (s.includes('data science') || s === 'da' || s === 'ds' || s === 'd sc') {
    return {
      label: '📊 D Sc',
      bg: '#ecfccb',
      color: '#4d7c0f',
      border: '#d9f99d'
    };
  }
  
  // Default
  const rawLabel = subjectStr || 'General';
  const displayLabel = rawLabel.length > 12 ? rawLabel.substring(0, 12) + '...' : rawLabel;
  return {
    label: `📚 ${displayLabel}`,
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0'
  };
}
