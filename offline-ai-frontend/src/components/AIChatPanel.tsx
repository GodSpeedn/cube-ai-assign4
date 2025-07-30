import React, { useState, useCallback, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import AIInput from './AIInput';
import React from 'react';
import { Agent, AgentConnection } from '../types/ai';

interface AIChatPanelProps {
  selectedAgent: Agent | null;
  selectedConnection: AgentConnection | null;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  selectedAgent,
  selectedConnection,
}) => {
  // Prefer showing connection messages if a connection is selected
  const messages = selectedConnection
    ? selectedConnection.messages || []
    : selectedAgent
    ? selectedAgent.messages || []
    : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 h-96 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
        {selectedConnection
          ? `Conversation: ${selectedConnection.sourceAgent.name} → ${selectedConnection.targetAgent?.name}`
          : selectedAgent
          ? `Agent: ${selectedAgent.name}`
          : 'No selection'}
      </h2>
      <div className="space-y-2">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-sm">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-sm"
            >
              <span className="font-medium">{msg.sender}: </span>
              <span>{msg.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AIChatPanel;

interface AIBlock {
  id: string;
  name: string;
  type: 'coordinator' | 'coder' | 'tester' | 'runner';
  content: string;
  commandToNext?: string;
  error?: string;
  isActive?: boolean;
  progress?: number;
  timestamp: number;
  iteration: number;
}

interface CodeState {
  code: string;
  testCode: string;
  history: {
    code: string[];
    testCode: string[];
    errors: string[];
  };
}

const MAX_ITERATIONS = 5;

interface AbortError extends Error {
  name: 'AbortError';
}

const isAbortError = (error: unknown): error is AbortError => {
  return error instanceof Error && error.name === 'AbortError';
};

export default function AIChatPanel() {
  const { isDark } = useTheme();
  const [aiInteractions, setAiInteractions] = useState<AIBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const codeStateRef = useRef<CodeState>({
    code: '',
    testCode: '',
    history: {
      code: [],
      testCode: [],
      errors: []
    }
  });

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setAiInteractions(prev => prev.map(block => ({
      ...block,
      isActive: false,
      progress: block.progress === 100 ? 100 : 0
    })));
  };

  const analyzeTestResults = (testOutput: string): { needsCodeFix: boolean; missingTests: string[] } => {
    const lines = testOutput.split('\n');
    const missingTests: string[] = [];
    let needsCodeFix = false;
    let hasPassingTests = false;

    lines.forEach(line => {
      const lineLower = line.toLowerCase();
      if (lineLower.includes('pass')) {
        hasPassingTests = true;
      } else if (lineLower.includes('fail')) {
        if (lineLower.includes('no test case defined') || 
            lineLower.includes('test not found') ||
            lineLower.includes('test_name')) {
          missingTests.push(line.split(':')[0].trim());
        } else {
          needsCodeFix = true;
        }
      }
    });

    // If we have no passing tests and no specific failures, we need better tests
    if (!hasPassingTests && !needsCodeFix && missingTests.length === 0) {
      needsCodeFix = true;
    }

    return { needsCodeFix, missingTests };
  };

  const processIteration = useCallback(async (
    code: string,
    testCode: string,
    iteration: number
  ): Promise<{ success: boolean; code: string; testCode: string }> => {
    if (iteration >= MAX_ITERATIONS) {
      setAiInteractions(prev => [...prev, {
        id: '0',
        name: 'Coordinator',
        type: 'coordinator',
        content: 'Maximum iteration limit reached. Please review the code manually.',
        isActive: false,
        progress: 100,
        timestamp: Date.now(),
        iteration
      }]);
      return { success: false, code, testCode };
    }

    // Update code state
    codeStateRef.current.code = code;
    codeStateRef.current.testCode = testCode;
    codeStateRef.current.history.code.push(code);
    codeStateRef.current.history.testCode.push(testCode);

    // Add test runner block
    setAiInteractions(prev => [...prev, {
      id: '3',
      name: 'Test Runner',
      type: 'runner',
      content: `Running tests (Iteration ${iteration + 1})...`,
      isActive: true,
      progress: 0,
      timestamp: Date.now(),
      iteration
    }]);

    // Simulate progress for test execution
    const runProgressInterval = setInterval(() => {
      setAiInteractions(prev => prev.map(block => 
        block.id === '3' && block.isActive && block.iteration === iteration
          ? { ...block, progress: Math.min((block.progress || 0) + 5, 90) }
          : block
      ));
    }, 500);

    try {
      // Run tests
      const runResponse = await fetch('http://localhost:8000/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          test_code: testCode,
          previous_errors: codeStateRef.current.history.errors
        }),
        signal: abortControllerRef.current?.signal
      });
      const runData = await runResponse.json();
      clearInterval(runProgressInterval);

      // Add test results
      setAiInteractions(prev => [...prev, {
        id: '3',
        name: 'Test Runner',
        type: 'runner',
        content: runData.output,
        isActive: false,
        progress: 100,
        timestamp: Date.now(),
        iteration
      }]);

      // Add coordinator to analyze results
      setAiInteractions(prev => [...prev, {
        id: '0',
        name: 'Coordinator',
        type: 'coordinator',
        content: 'Analyzing test results...',
        isActive: true,
        progress: 0,
        timestamp: Date.now(),
        iteration
      }]);

      const { needsCodeFix, missingTests } = analyzeTestResults(runData.output);

      if (missingTests.length > 0) {
        // Add coordinator's decision
        setAiInteractions(prev => [...prev, {
          id: '0',
          name: 'Coordinator',
          type: 'coordinator',
          content: `Missing test cases detected for: ${missingTests.join(', ')}`,
          commandToNext: 'Test Generator needs to add missing test cases.',
          isActive: false,
          progress: 100,
          timestamp: Date.now(),
          iteration
        }]);

        // Add test generator block
        setAiInteractions(prev => [...prev, {
          id: '2',
          name: 'Test Generator',
          type: 'tester',
          content: 'Adding missing test cases...',
          isActive: true,
          progress: 0,
          timestamp: Date.now(),
          iteration
        }]);

        // Simulate progress for test generation
        const testProgressInterval = setInterval(() => {
          setAiInteractions(prev => prev.map(block => 
            block.id === '2' && block.isActive && block.iteration === iteration
              ? { ...block, progress: Math.min((block.progress || 0) + 5, 90) }
              : block
          ));
        }, 500);

        try {
          // Generate additional tests
          const testResponse = await fetch('http://localhost:8000/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: code,
              missing_tests: missingTests,
              existing_tests: testCode,
              test_history: codeStateRef.current.history.testCode,
              previous_errors: codeStateRef.current.history.errors
            }),
            signal: abortControllerRef.current?.signal
          });
          const testData = await testResponse.json();
          clearInterval(testProgressInterval);

          // Update with new test cases
          setAiInteractions(prev => [...prev, {
            id: '2',
            name: 'Test Generator',
            type: 'tester',
            content: testData.code,
            commandToNext: 'Added missing test cases. Running tests again...',
            isActive: false,
            progress: 100,
            timestamp: Date.now(),
            iteration
          }]);

          // Recursively process the next iteration with updated tests
          return processIteration(code, testData.code, iteration + 1);
        } catch (error: unknown) {
          if (isAbortError(error)) {
            throw error;
          }
          clearInterval(testProgressInterval);
          throw error;
        }
      } else if (needsCodeFix) {
        // Add coordinator's decision
        setAiInteractions(prev => [...prev, {
          id: '0',
          name: 'Coordinator',
          type: 'coordinator',
          content: 'Test failures detected that require code fixes.',
          commandToNext: 'Code Generator needs to fix the implementation.',
          isActive: false,
          progress: 100,
          timestamp: Date.now(),
          iteration
        }]);

        // Add code generator's response to failure
        setAiInteractions(prev => [...prev, {
          id: '1',
          name: 'Code Generator',
          type: 'coder',
          content: 'Analyzing test failures...',
          isActive: true,
          progress: 0,
          timestamp: Date.now(),
          iteration
        }]);

        // Simulate progress for code refinement
        const refineProgressInterval = setInterval(() => {
          setAiInteractions(prev => prev.map(block => 
            block.id === '1' && block.isActive && block.iteration === iteration
              ? { ...block, progress: Math.min((block.progress || 0) + 5, 90) }
              : block
          ));
        }, 500);

        try {
          // Call refine-code endpoint
          const refineResponse = await fetch('http://localhost:8000/refine-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              test_code: testCode,
              test_output: runData.output,
              code_history: codeStateRef.current.history.code,
              error_history: codeStateRef.current.history.errors,
              previous_errors: codeStateRef.current.history.errors
            }),
            signal: abortControllerRef.current?.signal
          });
          const refineData = await refineResponse.json();
          clearInterval(refineProgressInterval);

          // Update error history
          codeStateRef.current.history.errors.push(runData.output);

          // Add refined code result
          setAiInteractions(prev => [...prev, {
            id: '1',
            name: 'Code Generator',
            type: 'coder',
            content: refineData.code,
            commandToNext: 'Fixed implementation issues. Running tests again...',
            isActive: false,
            progress: 100,
            timestamp: Date.now(),
            iteration
          }]);

          // Recursively process the next iteration with refined code
          return processIteration(refineData.code, testCode, iteration + 1);
        } catch (error: unknown) {
          if (isAbortError(error)) {
            throw error;
          }
          clearInterval(refineProgressInterval);
          throw error;
        }
      } else {
        // Add coordinator's success message
        setAiInteractions(prev => [...prev, {
          id: '0',
          name: 'Coordinator',
          type: 'coordinator',
          content: 'All tests passed successfully!',
          commandToNext: 'The implementation is working as expected.',
          isActive: false,
          progress: 100,
          timestamp: Date.now(),
          iteration
        }]);
        return { success: true, code, testCode };
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }
      clearInterval(runProgressInterval);
      throw error;
    }
  }, []);

  const handleSubmit = async (prompt: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    // Reset code state for new generation
    codeStateRef.current = {
      code: '',
      testCode: '',
      history: {
        code: [],
        testCode: [],
        errors: []
      }
    };

    try {
      // Clear previous interactions
      setAiInteractions([]);

      // Add initial coordinator block
      setAiInteractions(prev => [...prev, {
        id: '0',
        name: 'Coordinator',
        type: 'coordinator',
        content: 'Starting code generation process...',
        isActive: true,
        progress: 0,
        timestamp: Date.now(),
        iteration: 0
      }]);

      // Add initial code generator block
      setAiInteractions(prev => [...prev, {
        id: '1',
        name: 'Code Generator',
        type: 'coder',
        content: 'Generating code...',
        isActive: true,
        progress: 0,
        timestamp: Date.now(),
        iteration: 0
      }]);

      // Simulate progress for code generation
      const progressInterval = setInterval(() => {
        setAiInteractions(prev => prev.map(block => 
          (block.id === '0' || block.id === '1') && block.isActive && block.iteration === 0
            ? { ...block, progress: Math.min((block.progress || 0) + 5, 90) }
            : block
        ));
      }, 500);

      try {
        // Call backend to generate code
        const codeResponse = await fetch('http://localhost:8000/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: abortControllerRef.current.signal
        });
        const codeData = await codeResponse.json();
        clearInterval(progressInterval);

        // Update coordinator
        setAiInteractions(prev => [...prev, {
          id: '0',
          name: 'Coordinator',
          type: 'coordinator',
          content: 'Code generated successfully.',
          commandToNext: 'Requesting test generation...',
          isActive: false,
          progress: 100,
          timestamp: Date.now(),
          iteration: 0
        }]);

        // Update with code generation result
        setAiInteractions(prev => [...prev, {
          id: '1',
          name: 'Code Generator',
          type: 'coder',
          content: codeData.code,
          commandToNext: 'Here is the generated code. Please create appropriate unit tests for it.',
          isActive: false,
          progress: 100,
          timestamp: Date.now(),
          iteration: 0
        }]);

        // Add test generator block
        setAiInteractions(prev => [...prev, {
          id: '2',
          name: 'Test Generator',
          type: 'tester',
          content: 'Analyzing code to generate tests...',
          isActive: true,
          progress: 0,
          timestamp: Date.now(),
          iteration: 0
        }]);

        // Simulate progress for test generation
        const testProgressInterval = setInterval(() => {
          setAiInteractions(prev => prev.map(block => 
            block.id === '2' && block.isActive && block.iteration === 0
              ? { ...block, progress: Math.min((block.progress || 0) + 5, 90) }
              : block
          ));
        }, 500);

        try {
          // Generate tests
          const testResponse = await fetch('http://localhost:8000/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: codeData.code,
              code_history: codeStateRef.current.history.code
            }),
            signal: abortControllerRef.current.signal
          });
          const testData = await testResponse.json();
          clearInterval(testProgressInterval);

          // Update coordinator
          setAiInteractions(prev => [...prev, {
            id: '0',
            name: 'Coordinator',
            type: 'coordinator',
            content: 'Tests generated successfully.',
            commandToNext: 'Starting test execution...',
            isActive: false,
            progress: 100,
            timestamp: Date.now(),
            iteration: 0
          }]);

          // Update with test generation result
          setAiInteractions(prev => [...prev, {
            id: '2',
            name: 'Test Generator',
            type: 'tester',
            content: testData.code,
            commandToNext: 'I have created tests for the code. Please run them and verify the functionality.',
            isActive: false,
            progress: 100,
            timestamp: Date.now(),
            iteration: 0
          }]);

          // Start the iteration process
          await processIteration(codeData.code, testData.code, 0);
        } catch (error: unknown) {
          if (isAbortError(error)) {
            throw error;
          }
          clearInterval(testProgressInterval);
          throw error;
        }
      } catch (error: unknown) {
        if (isAbortError(error)) {
          throw error;
        }
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        console.log('Generation stopped by user');
      } else {
        console.error('Error:', error);
        setAiInteractions(prev => [...prev, {
          id: '0',
          name: 'Coordinator',
          type: 'coordinator',
          content: 'An error occurred',
          error: 'An error occurred. Please try again.',
          commandToNext: 'I encountered an error. Please check the input and try again.',
          isActive: false,
          progress: 0,
          timestamp: Date.now(),
          iteration: 0
        }]);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          {aiInteractions.map((block, index) => (
            <div key={`${block.id}-${block.timestamp}`} className="relative">
              {/* AI Block */}
              <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg relative
                ${block.isActive ? 'animate-pulse-border' : ''}`}>
                <div className="flex items-center mb-3">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    block.type === 'coordinator' ? 'bg-yellow-500' :
                    block.type === 'coder' ? 'bg-blue-500' :
                    block.type === 'tester' ? 'bg-green-500' :
                    'bg-purple-500'
                  } ${block.isActive ? 'animate-pulse' : ''}`} />
                  <h3 className="text-lg font-semibold">{block.name}</h3>
                  {block.isActive && (
                    <span className="ml-2 text-sm text-blue-500">Working...</span>
                  )}
                  {block.iteration > 0 && (
                    <span className="ml-2 text-sm text-gray-500">(Iteration {block.iteration + 1})</span>
                  )}
                </div>
                <div className={`p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'} mb-3`}>
                  <pre className="whitespace-pre-wrap">{block.content}</pre>
                </div>
                {block.error && (
                  <div className={`p-3 rounded ${isDark ? 'bg-red-900/50' : 'bg-red-50'} border-l-4 border-red-500 mb-3`}>
                    <p className="text-sm font-medium mb-1 text-red-500">Error:</p>
                    <pre className="whitespace-pre-wrap text-sm">{block.error}</pre>
                  </div>
                )}
                {block.commandToNext && (
                  <div className={`p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-l-4 border-blue-500`}>
                    <p className="text-sm font-medium mb-1">Message to next AI:</p>
                    <pre className="whitespace-pre-wrap text-sm">{block.commandToNext}</pre>
                  </div>
                )}
                {/* Progress Bar */}
                <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      block.isActive ? 'bg-blue-500' : 
                      block.progress === 100 ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${block.progress}%` }}
                  />
                </div>
              </div>

              {/* Connection Line */}
              {index < aiInteractions.length - 1 && (
                <div className="absolute left-6 top-full w-0.5 h-4 bg-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        {isProcessing && (
          <button
            onClick={stopGeneration}
            className="absolute right-4 top-4 px-3 py-1 text-sm font-medium text-red-500 hover:text-red-600 
                     bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
          >
            Stop Generation
          </button>
        )}
        <AIInput onSubmit={handleSubmit} disabled={isProcessing} />
      </div>
    </div>
  );
} 