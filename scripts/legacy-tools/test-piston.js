async function run() {
  const code = "def double(x):\n  return x*2\n\ntry:\n    res = solution(5)\n    print(res)\nexcept Exception as e:\n    pass";
  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'python',
      version: '3.10.0',
      files: [{ content: code }]
    }),
  });
  console.log(response.status);
  console.log(await response.text());
}
run();
