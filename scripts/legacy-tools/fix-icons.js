const fs = require('fs');
let content = fs.readFileSync('components/Navbar.js', 'utf8');

content = content.replace(
  "{ name: '📊 Dashboard', path: '/dashboard/teacher' }",
  "{ name: 'Dashboard', path: '/dashboard/teacher', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"9\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\"></rect><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\"></rect><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\"></rect></svg> }"
);

content = content.replace(
  "{ name: '📂 Question Bank', path: '/dashboard/teacher/question-bank' }",
  "{ name: 'Question Bank', path: '/dashboard/teacher/question-bank', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"></path><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"></path></svg> }"
);

content = content.replace(
  "{ name: '➕ Create Exam', path: '/dashboard/teacher/create-exam' }",
  "{ name: 'Create Exam', path: '/dashboard/teacher/create-exam', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M12 5v14\"></path><path d=\"M5 12h14\"></path></svg> }"
);

content = content.replace(
  "{ name: '📝 Available Exams', path: '/dashboard/student' }",
  "{ name: 'Available Exams', path: '/dashboard/student', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"></line><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"></line><polyline points=\"10 9 9 9 8 9\"></polyline></svg> }"
);

content = content.replace(
  "{ name: '🌎 Practice Arena', path: '/dashboard/student/practice' }",
  "{ name: 'Practice Arena', path: '/dashboard/student/practice', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline></svg> }"
);

content = content.replace(
  "{ name: '🏆 My Results', path: '/dashboard/student/results' }",
  "{ name: 'My Results', path: '/dashboard/student/results', icon: <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"></path><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"></path><path d=\"M4 22h16\"></path><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"></path><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"></path><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\"></path></svg> }"
);

fs.writeFileSync('components/Navbar.js', content);
