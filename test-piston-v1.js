async function run() {
  const code = "def double(x):\n  return x*2\n\ntry:\n    res = double(5)\n    print(res)\nexcept Exception as e:\n    pass";
  const response = await fetch('https://emkc.org/api/v1/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'python',
      source: code
    }),
  });
  console.log(response.status);
  console.log(await response.text());
}
run();
