import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { language, code } = await req.json();

    if (!language || !code) {
      return NextResponse.json({ error: 'Language and code are required' }, { status: 400 });
    }

    // Map common names to Piston language aliases
    const languageMap = {
      'python': { lang: 'python', version: '3.10.0' },
      'javascript': { lang: 'javascript', version: '18.15.0' },
      'java': { lang: 'java', version: '15.0.2' },
      'cpp': { lang: 'cpp', version: '10.2.0' },
      'c': { lang: 'c', version: '10.2.0' },
      'rust': { lang: 'rust', version: '1.68.2' },
    };

    const pistonLang = languageMap[language.toLowerCase()];
    
    if (!pistonLang) {
      return NextResponse.json({ error: `Language ${language} is not supported yet.` }, { status: 400 });
    }

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: pistonLang.lang,
        version: pistonLang.version,
        files: [
          {
            content: code,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Execution engine failed');
    }

    const data = await response.json();
    
    // Determine output
    let output = '';
    if (data.run) {
      output = data.run.output || '';
      if (data.run.stderr && !output.includes(data.run.stderr)) {
         output += '\n' + data.run.stderr;
      }
    }

    return NextResponse.json({ output: output.trim() });
  } catch (error) {
    console.error('Execution Error:', error);
    return NextResponse.json({ error: 'Failed to execute code securely.' }, { status: 500 });
  }
}
