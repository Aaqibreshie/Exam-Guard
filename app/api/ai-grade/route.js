import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { question_text, student_answer, correct_answer, points = 5 } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured for AI grading' }, { status: 501 });
    }

    if (!student_answer || String(student_answer).trim() === '') {
      return NextResponse.json({
        success: true,
        is_correct: false,
        points_earned: 0,
        feedback: 'No code submitted.'
      });
    }

    const prompt = `You are a strict but fair computer science professor grading a student's code submission.
Evaluate the following student code for correctness based on the problem description.

PROBLEM DESCRIPTION:
"${question_text}"

MAXIMUM POINTS: ${points}

${correct_answer ? `REFERENCE SOLUTION (For guidance, student does not need to match exactly):\n"${correct_answer}"\n` : ''}

STUDENT'S SUBMISSION:
\`\`\`javascript
${student_answer}
\`\`\`

GRADING RUBRIC:
1. If the core logic is correct and handles the requirements, award full points (${points}).
2. If the logic is mostly correct but has minor syntax errors or edge-case failures, award partial points (e.g., Math.floor(${points} * 0.5)).
3. If the code is completely incorrect, irrelevant, or empty, award 0 points.
4. Set "is_correct" to true ONLY if they earned full points, otherwise false.

Respond ONLY with a valid JSON object matching this schema exactly (no markdown fences, no explanations outside JSON):
{
  "is_correct": boolean,
  "points_earned": number,
  "feedback": "A short 1-sentence explanation of the grade"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from model');

    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      is_correct: parsed.is_correct,
      points_earned: typeof parsed.points_earned === 'number' ? parsed.points_earned : (parsed.is_correct ? points : 0),
      feedback: parsed.feedback || ''
    });

  } catch (error) {
    console.error('AI Grading Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to grade with AI' }, { status: 500 });
  }
}
