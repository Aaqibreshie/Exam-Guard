import React from 'react';

export function getSubjectStyling(subjectStr) {
  const s = (subjectStr || 'General').toLowerCase().trim();
  
  if (s.includes('mern') || s === 'web dev') {
    return {
      label: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display: "inline-block", verticalAlign: "middle", marginTop: "-2px"}}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> MERN</>,
      bg: '#e0f2fe',
      color: '#0284c7',
      border: '#bae6fd'
    };
  }
  
  if (s.includes('git')) {
    return {
      label: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display: "inline-block", verticalAlign: "middle", marginTop: "-2px"}}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg> GIT</>,
      bg: '#f5f3ff',
      color: '#7c3aed',
      border: '#ddd6fe'
    };
  }
  
  if (s.includes('data science') || s === 'da' || s === 'ds' || s === 'd sc') {
    return {
      label: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display: "inline-block", verticalAlign: "middle", marginTop: "-2px"}}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> D Sc</>,
      bg: '#ecfccb',
      color: '#4d7c0f',
      border: '#d9f99d'
    };
  }
  
  // Default
  const rawLabel = subjectStr || 'General';
  const displayLabel = rawLabel.length > 12 ? rawLabel.substring(0, 12) + '...' : rawLabel;
  return {
    label: <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px", display: "inline-block", verticalAlign: "middle", marginTop: "-2px"}}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> {displayLabel}</>,
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0'
  };
}
