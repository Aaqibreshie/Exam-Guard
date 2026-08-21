'use client';

import { useState, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { runTestCases } from '@/lib/code-runner';

// Pre-configure Monaco (optional, but good for custom themes)
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });

export default function CodeEditor({
  initialCode = '',
  starterCode = '',
  testCases = [],
  language = 'javascript',
  onChange,
  onRunResults,
  readOnly = false,
  height = '360px'
}) {
  const [code, setCode] = useState(initialCode || starterCode || '');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'console'

  // Sync internal state if initialCode changes
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== code) {
      setCode(initialCode || starterCode || '');
    }
  }, [initialCode, starterCode]);

  const handleEditorChange = (value) => {
    const val = value || '';
    setCode(val);
    if (onChange) onChange(val);
  };

  const handleReset = () => {
    if (confirm('Reset your code to the original template? Current changes will be overwritten.')) {
      const resetVal = starterCode || '';
      setCode(resetVal);
      if (onChange) onChange(resetVal);
      setTestResults(null);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const results = await runTestCases(code, testCases, language);
      setTestResults(results);
      if (onRunResults) onRunResults(results);
      if (results.results?.length > 0) {
        setActiveTab('tests');
      } else {
        setActiveTab('console');
      }
    } catch (err) {
      console.error('Error running code:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      border: '1px solid #334155',
      background: '#0f172a',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    }}>
      {/* Editor Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginLeft: '8px' }}>
            solution.{language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'rust' ? 'rs' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : 'js'} ({language})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {starterCode && !readOnly && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: '1px solid #475569',
                color: '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Reset to starter template"
            >
              ↺ Reset
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isRunning ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Run Test Cases</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor Body */}
      <div style={{ height, position: 'relative', background: '#0f172a', padding: '10px 0' }}>
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 10, bottom: 10 },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'hidden'
            }
          }}
        />
      </div>

      {/* Test Results Console */}
      {testResults && (
        <div style={{
          background: '#090d16',
          borderTop: '1px solid #334155',
          padding: '12px 16px',
          maxHeight: '260px',
          overflowY: 'auto'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '8px'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'tests' ? '#10b981' : '#64748b',
                  fontWeight: activeTab === 'tests' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderBottom: activeTab === 'tests' ? '2px solid #10b981' : 'none'
                }}
              >
                Test Cases ({testResults.passedTests}/{testResults.totalTests})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('console')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'console' ? '#10b981' : '#64748b',
                  fontWeight: activeTab === 'console' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderBottom: activeTab === 'console' ? '2px solid #10b981' : 'none'
                }}
              >
                Console Logs
              </button>
            </div>

            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: testResults.passPercentage === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: testResults.passPercentage === 100 ? '#10b981' : '#ef4444',
              border: `1px solid ${testResults.passPercentage === 100 ? '#059669' : '#dc2626'}`
            }}>
              {testResults.passPercentage}% Passed
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'tests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {testResults.results?.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  {testResults.rawExecution?.success 
                    ? 'Code executed successfully without runtime errors.' 
                    : `Execution Error: ${testResults.rawExecution?.error}`}
                </div>
              ) : (
                testResults.results.map((r, idx) => (
                  <div key={idx} style={{
                    background: r.passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${r.passed ? '#059669' : '#ef4444'}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{r.passed ? '✅' : '❌'}</span>
                        <strong style={{ color: '#f8fafc' }}>{r.description}</strong>
                        {r.hidden && (
                          <span style={{ fontSize: '0.7rem', background: '#334155', color: '#cbd5e1', padding: '1px 6px', borderRadius: '4px' }}>
                            Hidden
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{r.timeMs}ms</span>
                    </div>

                    {!r.hidden && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '8px',
                        marginTop: '6px',
                        color: '#cbd5e1'
                      }}>
                        {r.input && (
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Input:</span>
                            <code style={{ color: '#38bdf8' }}>{r.input}</code>
                          </div>
                        )}
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Expected:</span>
                          <code style={{ color: '#10b981' }}>{r.expected}</code>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Actual:</span>
                          <code style={{ color: r.passed ? '#10b981' : '#ef4444' }}>
                            {r.error ? `Error: ${r.error}` : r.actual}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'console' && (
            <div style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: '1.4'
            }}>
              {(testResults.results?.some(r => r.logs?.length > 0) || testResults.rawExecution?.logs?.length > 0) ? (
                <div>
                  {(testResults.rawExecution?.logs || []).map((log, idx) => (
                    <div key={idx} style={{ color: '#cbd5e1' }}>{log}</div>
                  ))}
                  {testResults.results?.map((r, i) => (
                    r.logs?.map((log, j) => (
                      <div key={`${i}-${j}`} style={{ color: '#cbd5e1' }}>{log}</div>
                    ))
                  ))}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                  No console output generated.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
