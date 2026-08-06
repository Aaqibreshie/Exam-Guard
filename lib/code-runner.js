/**
 * ExamGuard Sandboxed In-Browser Code Execution Engine
 * Safe client-side JavaScript execution with timeout protection and test-case verification.
 */

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
  // Direct equality
  if (actual === expected) return true;

  // Format and trim comparison
  const strActual = formatOutput(actual).trim();
  const strExpected = formatOutput(expected).trim();
  if (strActual === strExpected) return true;

  // Try parsing both as JSON and comparing normalized JSON
  try {
    const parsedActual = typeof actual === 'string' ? JSON.parse(actual) : actual;
    const parsedExpected = typeof expected === 'string' ? JSON.parse(expected) : expected;
    return JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
  } catch {
    // String normalize fallback (ignoring trailing newlines/quotes)
    return strActual.replace(/^["']|["']$/g, '') === strExpected.replace(/^["']|["']$/g, '');
  }
}

/**
 * Execute standalone code snippet and capture console logs
 */
export async function executeCode(code, timeoutMs = 2500) {
  const logs = [];
  const startTime = performance.now();

  try {
    // Custom console to intercept logging
    const customConsole = {
      log: (...args) => logs.push(args.map(formatOutput).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.map(formatOutput).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.map(formatOutput).join(' ')),
      info: (...args) => logs.push(args.map(formatOutput).join(' '))
    };

    // Create async function with sandboxed console & wrapped execution
    const runnerFn = new Function('console', `
      'use strict';
      try {
        ${code}
      } catch (err) {
        throw err;
      }
    `);

    // Run with timeout race
    const executionPromise = Promise.resolve().then(() => runnerFn(customConsole));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Execution timed out (${timeoutMs}ms limit exceeded). Check for infinite loops.`)), timeoutMs)
    );

    const result = await Promise.race([executionPromise, timeoutPromise]);
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      result: formatOutput(result),
      logs,
      executionTimeMs
    };
  } catch (err) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      error: err.message || 'Execution error',
      logs,
      executionTimeMs
    };
  }
}

/**
 * Run test cases against user code
 * @param {string} code - The student's code
 * @param {Array} testCases - Array of { input, expected_output, description, hidden }
 */
export async function runTestCases(code, testCases = [], timeoutMs = 2500) {
  if (!testCases || testCases.length === 0) {
    // If no test cases, just run the code once
    const exec = await executeCode(code, timeoutMs);
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      passPercentage: exec.success ? 100 : 0,
      results: [],
      rawExecution: exec
    };
  }

  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const rawInput = tc.input !== undefined ? String(tc.input).trim() : '';
    const rawExpected = tc.expected_output !== undefined ? tc.expected_output : '';
    const description = tc.description || `Test Case #${i + 1}`;
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
      // Construct wrapped evaluation:
      // If code defines functions, find the first function or solution function to invoke with input
      const testWrapper = `
        'use strict';
        ${code}
        
        // Find entry function if available
        let __entryFn = null;
        if (typeof solution === 'function') __entryFn = solution;
        else if (typeof main === 'function') __entryFn = main;
        else if (typeof solve === 'function') __entryFn = solve;

        // Try evaluating with input
        let __testInput = undefined;
        try {
          __testInput = ${rawInput ? `(${rawInput})` : 'undefined'};
        } catch (_) {
          __testInput = ${JSON.stringify(rawInput)};
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
        
        // If no explicit function, try executing code with input expression
        return typeof result !== 'undefined' ? result : undefined;
      `;

      const runnerFn = new Function('console', testWrapper);

      const executionPromise = Promise.resolve().then(() => runnerFn(customConsole));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test case timed out (${timeoutMs}ms limit exceeded).`)), timeoutMs)
      );

      const res = await Promise.race([executionPromise, timeoutPromise]);
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

  const passPercentage = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 100;

  return {
    totalTests: testCases.length,
    passedTests: passedCount,
    failedTests: testCases.length - passedCount,
    passPercentage,
    results
  };
}
