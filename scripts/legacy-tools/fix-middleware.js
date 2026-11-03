const fs = require('fs');
let content = fs.readFileSync('middleware.js', 'utf8');

content = content.replace(
  "const { data: { user } } = await supabase.auth.getUser();",
  "const { data: { session } } = await supabase.auth.getSession();\n  const user = session?.user;"
);

fs.writeFileSync('middleware.js', content);
