const fs = require('fs');
let c = fs.readFileSync('components/ExamCard.js', 'utf8');

c = c.replace(
  "{exam.is_published ? '<svg",
  "{exam.is_published ? <><svg"
);
c = c.replace(
  "</svg> Published'",
  "</svg> Published</>"
);
c = c.replace(
  ": '<svg",
  ": <><svg"
);
c = c.replace(
  "</svg> Draft'",
  "</svg> Draft</>"
);

c = c.replace(
  "{deleting ? '...' : '<svg",
  "{deleting ? '...' : <><svg"
);
c = c.replace(
  "</svg> Delete'}",
  "</svg> Delete</>}"
);

c = c.replace(
  "                  '<svg",
  "                  <><svg"
);
c = c.replace(
  "</svg> Live Coding'",
  "</svg> Live Coding</>"
);
c = c.replace(
  "</svg> Theory + Code'",
  "</svg> Theory + Code</>"
);


fs.writeFileSync('components/ExamCard.js', c);
