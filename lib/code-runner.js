/**
 * ExamGuard Sandboxed In-Browser Code Execution Engine
 * Safe client-side JavaScript execution using Web Workers to prevent infinite loops from freezing the UI.
 */

const workerScript = `
  // Helper to safely format values to readable strings
  function formatOutput(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  // Deep equality check between actual and expected
  function areEqual(actual, expected) {
    if (actual === expected) return true;
    const strActual = formatOutput(actual).trim();
    const strExpected = formatOutput(expected).trim();
    if (strActual === strExpected) return true;
    try {
      const parsedActual = typeof actual === 'string' ? JSON.parse(actual) : actual;
      const parsedExpected = typeof expected === 'string' ? JSON.parse(expected) : expected;
      return JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
    } catch {
      return strActual.replace(/^["']|["']$/g, '') === strExpected.replace(/^["']|["']$/g, '');
    }
  }

  self.onmessage = async function(e) {
    const { id, type, code, testCases } = e.data;
    
    if (type === 'EXECUTE') {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.map(formatOutput).join(' ')),
        warn: (...args) => logs.push('[WARN] ' + args.map(formatOutput).join(' ')),
        error: (...args) => logs.push('[ERROR] ' + args.map(formatOutput).join(' ')),
        info: (...args) => logs.push(args.map(formatOutput).join(' '))
      };

      try {
        const runnerFn = new Function('console', "'use strict';\\n" + code);
        const result = runnerFn(customConsole);
        self.postMessage({ id, success: true, result: formatOutput(result), logs });
      } catch (err) {
        self.postMessage({ id, success: false, error: err.message || 'Execution error', logs });
      }
    } 
    else if (type === 'RUN_TESTS') {
      const results = [];
      let passedCount = 0;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const rawInput = tc.input !== undefined ? String(tc.input).trim() : '';
        const rawExpected = tc.expected_output !== undefined ? tc.expected_output : '';
        const description = tc.description || \`Test Case #\${i + 1}\`;
        const logs = [];

        const customConsole = {
          log: (...args) => logs.push(args.map(formatOutput).join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.map(formatOutput).join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.map(formatOutput).join(' ')),
          info: (...args) => logs.push(args.map(formatOutput).join(' '))
        };

        const startTime = performance.now();
        let actualOutput = null;
        let error = null;
        let passed = false;

        try {
          // Construct wrapped evaluation
          const testWrapper = \`
            'use strict';
            \${code}
            
            let __entryFn = null;
            if (typeof solution === 'function') __entryFn = solution;
            else if (typeof main === 'function') __entryFn = main;
            else if (typeof solve === 'function') __entryFn = solve;

            let __testInput = undefined;
            try {
              __testInput = \${rawInput ? \`(\${rawInput})\` : 'undefined'};
            } catch (_) {
              __testInput = \${JSON.stringify(rawInput)};
            }

            if (__entryFn) {
              const fnArity = __entryFn.length;
              if (fnArity > 1 && Array.isArray(__testInput)) {
                return __entryFn(...__testInput);
              } else if (__testInput !== undefined) {
                return __entryFn(__testInput);
              } else {
                return __entryFn();
              }
            }
            
            return typeof result !== 'undefined' ? result : undefined;
          \`;

          const runnerFn = new Function('console', testWrapper);
          const res = runnerFn(customConsole);
          actualOutput = res;
          passed = areEqual(actualOutput, rawExpected);
        } catch (err) {
          error = err.message || 'Runtime error during test execution';
          passed = false;
        }

        const timeMs = Math.round(performance.now() - startTime);
        if (passed) passedCount++;

        results.push({
          index: i + 1,
          description,
          input: rawInput,
          expected: formatOutput(rawExpected),
          actual: error ? null : formatOutput(actualOutput),
          passed,
          error,
          logs,
          timeMs,
          hidden: Boolean(tc.hidden)
        });
      }

      self.postMessage({ id, success: true, results, passedCount });
    }
  };
`;

function runInWorker(type, payload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    // Determine if we're in a browser environment
    if (typeof window === 'undefined') {
      reject(new Error('Web Workers are not available in this environment.'));
      return;
    }

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    const id = Date.now().toString() + Math.random().toString();
    const startTime = performance.now();

    const timeout = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(`Execution timed out (${timeoutMs}ms limit exceeded). Check for infinite loops.`));
    }, timeoutMs);

    worker.onmessage = (e) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        
        const executionTimeMs = Math.round(performance.now() - startTime);
        resolve({ ...e.data, executionTimeMs });
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      const executionTimeMs = Math.round(performance.now() - startTime);
      reject(new Error(err.message || 'Worker execution error'));
    };

    worker.postMessage({ id, type, ...payload });
  });
}

/**
 * Execute standalone code snippet and capture console logs
 */
export async function executeCode(code, timeoutMs = 3000) {
  try {
    const res = await runInWorker('EXECUTE', { code }, timeoutMs);
    return res;
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Execution error',
      logs: [],
      executionTimeMs: timeoutMs
    };
  }
}

/**
 * Run test cases against user code
 * @param {string} code - The student's code
 * @param {Array} testCases - Array of { input, expected_output, description, hidden }
 */

export async function runTestCases(code, testCases, language = 'javascript') {
  // Use fast local Web Worker for JavaScript
  if (language === 'javascript') {
    try {
      const result = await runInWorker('RUN_TESTS', { code, testCases }, 3000);
      const passedCount = result.passedCount || 0;
      const passPercentage = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 100;
      
      return {
        totalTests: testCases.length,
        passedTests: passedCount,
        failedTests: testCases.length - passedCount,
        passPercentage,
        results: result.results || []
      };
    } catch (err) {
      return {
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: testCases.length,
        passPercentage: 0,
        results: testCases.map((tc, i) => ({
          index: i + 1,
          description: tc.description || `Test Case #${i + 1}`,
          input: tc.input !== undefined ? String(tc.input) : '',
          expected: typeof tc.expected_output === 'object' ? JSON.stringify(tc.expected_output) : String(tc.expected_output),
          actual: null,
          passed: false,
          error: err.message || 'Execution error',
          logs: [],
          timeMs: 3000,
          hidden: Boolean(tc.hidden)
        }))
      };
    }
  }

  // Use Piston API for Python, Java, C++, etc.
  try {
    const results = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const rawInput = tc.input !== undefined ? String(tc.input).trim() : '';
      const rawExpected = tc.expected_output !== undefined ? tc.expected_output : '';
      
      // Construct wrapper code depending on language
      let wrapperCode = code;
      
      if (language === 'python') {
        // Simple Python test wrapper
        wrapperCode = `${code}\n\ntry:\n    res = solution(${rawInput || 'None'})\n    print(res)\nexcept Exception as e:\n    pass`;
      }

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code: wrapperCode })
      });

      if (!response.ok) {
        throw new Error('API Execution Error');
      }

      const { output, error } = await response.json();
      
      const actualOutput = output ? output.trim() : '';
      const expectedTrimmed = String(rawExpected).trim();
      const passed = actualOutput === expectedTrimmed;

      if (passed) passedCount++;

      results.push({
        index: i + 1,
        description: tc.description || `Test Case #${i + 1}`,
        input: rawInput,
        expected: expectedTrimmed,
        actual: error ? null : actualOutput,
        passed: passed,
        error: error || null,
        logs: [],
        timeMs: 0,
        hidden: Boolean(tc.hidden)
      });
    }

    const passPercentage = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 100;

    return {
      totalTests: testCases.length,
      passedTests: passedCount,
      failedTests: testCases.length - passedCount,
      passPercentage,
      results: results
    };
  } catch (err) {
    console.error('Remote execution error:', err);
    return {
      totalTests: testCases.length,
      passedTests: 0,
      failedTests: testCases.length,
      passPercentage: 0,
      results: testCases.map((tc, i) => ({
        index: i + 1,
        description: tc.description || `Test Case #${i + 1}`,
        input: tc.input !== undefined ? String(tc.input) : '',
        expected: typeof tc.expected_output === 'object' ? JSON.stringify(tc.expected_output) : String(tc.expected_output),
        actual: null,
        passed: false,
        error: err.message || 'Server execution failed',
        logs: [],
        timeMs: 0,
        hidden: Boolean(tc.hidden)
      }))
    };
  }
}
