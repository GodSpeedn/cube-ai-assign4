/**
 * Main Application Component
 * 
 * This component manages the overall state and coordination of the AI agents system.
 * It handles the communication flow between different agents (Coordinator, Coder, Tester, Runner)
 * and maintains the state of their interactions.
 * 
 * Key Features:
 * - Dark/light mode toggle
 * - Agent communication orchestration
 * - State management for agent interactions
 * - Real-time updates of agent messages
 */

import React, { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import FileTree from "./components/FileTree";
import CodeViewer from "./components/CodeViewer";
import { useTheme } from "./hooks/useTheme";
import AgentVisualization from "./components/AgentVisualization";
import "./styles/animations.css";

/**
 * Represents a single message block from an AI agent
 */
interface AIBlock {
  id: string;
  name: string;
  type: 'coordinator' | 'coder' | 'tester' | 'runner';
  content: string;
  timestamp: number;
  iteration: number;
}

/**
 * Represents the current state of the program being developed
 */
interface ProgramState {
  currentPhase: 'idle' | 'coding' | 'testing' | 'running' | 'complete';
  generatedCode: string | null;
  generatedTests: string | null;
  testResults: string | null;
  lastAction: string;
  context: {
    requirements: string[];
    dependencies: string[];
    constraints: string[];
    previousResults: string[];
  };
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'code' | 'ai'>('code');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [interactions, setInteractions] = useState<AIBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [programState, setProgramState] = useState<ProgramState>({
    currentPhase: 'idle',
    generatedCode: null,
    generatedTests: null,
    testResults: null,
    lastAction: 'Initialized',
    context: {
      requirements: [],
      dependencies: [],
      constraints: [],
      previousResults: []
    }
  });

  // Example interaction data - replace with actual API calls
  useEffect(() => {
    const exampleInteractions: AIBlock[] = [
      {
        id: '1',
        name: 'Coordinator Agent',
        type: 'coordinator',
        content: 'Ready to coordinate AI tasks...',
        timestamp: Date.now() - 5000,
        iteration: 1
      },
      {
        id: '2',
        name: 'Coder Agent (Mistral)',
        type: 'coder',
        content: 'Ready to generate and refine code...',
        timestamp: Date.now() - 4000,
        iteration: 1
      },
      {
        id: '3',
        name: 'Tester Agent (Phi)',
        type: 'tester',
        content: 'Ready to generate unit tests...',
        timestamp: Date.now() - 3000,
        iteration: 1
      },
      {
        id: '4',
        name: 'Runner Agent (Llama3.2)',
        type: 'runner',
        content: 'Ready to run tests and report outcomes...',
        timestamp: Date.now() - 2000,
        iteration: 1
      }
    ];
    setInteractions(exampleInteractions);
  }, []);

  /**
   * Handles the submission of a new prompt
   * Orchestrates the communication flow between agents
   */
  const handlePromptSubmit = async (prompt: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Initialize new task
    setProgramState(prev => ({
      ...prev,
      currentPhase: 'coding',
      lastAction: 'Starting new task',
      context: {
        requirements: [prompt],
        dependencies: [],
        constraints: [],
        previousResults: []
      }
    }));

    // Add initial coordinator message
    const coordinatorStart: AIBlock = {
      id: Date.now().toString(),
      name: 'Coordinator Agent',
      type: 'coordinator',
      content: `Starting new task: "${prompt}"\nAnalyzing requirements and coordinating with agents...`,
      timestamp: Date.now(),
      iteration: interactions.length + 1
    };
    setInteractions(prev => [...prev, coordinatorStart]);

    try {
      // 1. Generate code using backend API
      const codeResponse = await fetch('http://localhost:8000/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          code_history: programState.context.previousResults,
          error_history: []
        })
      });

      if (!codeResponse.ok) {
        throw new Error('Failed to generate code');
      }

      const { code: generatedCode, file: codeFile } = await codeResponse.json();

      // Add coder's response
      const coderResponse: AIBlock = {
        id: (Date.now() + 1).toString(),
        name: 'Coder Agent (Mistral)',
        type: 'coder',
        content: `Generated code for the task:\n\`\`\`python\n${generatedCode}\n\`\`\``,
        timestamp: Date.now(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, coderResponse]);

      // Update state with generated code
      setProgramState(prev => ({
        ...prev,
        currentPhase: 'testing',
        generatedCode,
        lastAction: 'Code generation complete',
        context: {
          ...prev.context,
          previousResults: [...prev.context.previousResults, 'Code generated successfully']
        }
      }));

      // 2. Generate tests using backend API
      const testResponse = await fetch('http://localhost:8000/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: generatedCode,
          code_history: [],
          error_history: []
        })
      });

      if (!testResponse.ok) {
        throw new Error('Failed to generate tests');
      }

      const { code: generatedTests, file: testFile } = await testResponse.json();

      // Add tester's response
      const testerResponse: AIBlock = {
        id: (Date.now() + 2).toString(),
        name: 'Tester Agent (Phi)',
        type: 'tester',
        content: `Generated test cases:\n\`\`\`python\n${generatedTests}\n\`\`\``,
        timestamp: Date.now(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, testerResponse]);

      // Update state with generated tests
      setProgramState(prev => ({
        ...prev,
        currentPhase: 'running',
        generatedTests,
        lastAction: 'Test generation complete',
        context: {
          ...prev.context,
          previousResults: [...prev.context.previousResults, 'Tests generated successfully']
        }
      }));

      // 3. Run tests using backend API
      const runTestResponse = await fetch('http://localhost:8000/run-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: generatedCode,
          test_code: generatedTests,
          previous_errors: []
        })
      });

      if (!runTestResponse.ok) {
        throw new Error('Failed to run tests');
      }

      const { output: testResults } = await runTestResponse.json();

      // Add runner's response
      const runnerResponse: AIBlock = {
        id: (Date.now() + 3).toString(),
        name: 'Runner Agent (Llama3.2)',
        type: 'runner',
        content: `Test execution results:\n\n${testResults}`,
        timestamp: Date.now(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, runnerResponse]);

      // Check if any tests failed
      if (testResults.includes('FAIL')) {
        // Add coordinator's analysis
        const coordinatorAnalysis: AIBlock = {
          id: (Date.now() + 4).toString(),
          name: 'Coordinator Agent',
          type: 'coordinator',
          content: 'Some tests have failed. Initiating code revision process...',
          timestamp: Date.now(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, coordinatorAnalysis]);

        // 4. Revise code based on test failures
        const refineResponse = await fetch('http://localhost:8000/refine-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: generatedCode,
            test_code: generatedTests,
            test_output: testResults,
            code_history: [generatedCode],
            error_history: [],
            previous_errors: []
          })
        });

        if (!refineResponse.ok) {
          throw new Error('Failed to refine code');
        }

        const { code: refinedCode, file: refinedFile } = await refineResponse.json();

        // Add coder's revision response
        const coderRevision: AIBlock = {
          id: (Date.now() + 5).toString(),
          name: 'Coder Agent (Mistral)',
          type: 'coder',
          content: `Code revised based on test failures:\n\`\`\`python\n${refinedCode}\n\`\`\``,
          timestamp: Date.now(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, coderRevision]);

        // Run tests again on refined code
        const rerunTestResponse = await fetch('http://localhost:8000/run-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: refinedCode,
            test_code: generatedTests,
            previous_errors: []
          })
        });

        if (!rerunTestResponse.ok) {
          throw new Error('Failed to run tests on refined code');
        }

        const { output: refinedTestResults } = await rerunTestResponse.json();

        // Add runner's final response
        const runnerFinalResponse: AIBlock = {
          id: (Date.now() + 6).toString(),
          name: 'Runner Agent (Llama3.2)',
          type: 'runner',
          content: `Final test execution results after revision:\n\n${refinedTestResults}`,
          timestamp: Date.now(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, runnerFinalResponse]);

        // Update state with refined code and results
        setProgramState(prev => ({
          ...prev,
          currentPhase: 'complete',
          generatedCode: refinedCode,
          testResults: refinedTestResults,
          lastAction: 'Code revision complete',
          context: {
            ...prev.context,
            previousResults: [...prev.context.previousResults, 'Code revised and tests re-run']
          }
        }));
      } else {
        // Update state with test results
        setProgramState(prev => ({
          ...prev,
          currentPhase: 'complete',
          testResults,
          lastAction: 'Test execution complete',
          context: {
            ...prev.context,
            previousResults: [...prev.context.previousResults, 'Tests executed successfully']
          }
        }));
      }

      // Add final coordinator summary
      const coordinatorSummary: AIBlock = {
        id: (Date.now() + 7).toString(),
        name: 'Coordinator Agent',
        type: 'coordinator',
        content: `Task completed!\n\nFinal Status:\n- Code: ${programState.generatedCode ? 'Generated' : 'Failed'}\n- Tests: ${programState.generatedTests ? 'Generated' : 'Failed'}\n- Test Results: ${programState.testResults ? 'Available' : 'Failed'}\n\nAll artifacts have been saved and are available for review.`,
        timestamp: Date.now(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, coordinatorSummary]);

    } catch (error: unknown) {
      console.error('Error:', error);
      // Add error interaction
      const errorInteraction: AIBlock = {
        id: Date.now().toString(),
        name: 'Coordinator Agent',
        type: 'coordinator',
        content: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, errorInteraction]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`h-screen w-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} text-${isDark ? 'white' : 'gray-900'} flex flex-col overflow-hidden transition-colors duration-200`}>
      {/* Top Bar */}
      <div className={`p-4 flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-xl font-bold">Offline AI Coding Assistant</h1>
        <div className="flex space-x-4">
          <button 
            className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} px-3 py-1 rounded transition-colors duration-200`}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            ⚙ Settings
          </button>
          <button 
            className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} px-3 py-1 rounded transition-colors duration-200`}
            onClick={toggleTheme}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          className={`px-4 py-2 ${activeTab === 'code' ? (isDark ? 'bg-gray-800' : 'bg-gray-200') : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code & Files
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'ai' ? (isDark ? 'bg-gray-800' : 'bg-gray-200') : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Communication
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' ? (
          <div className="flex h-full">
            <FileTree />
            <CodeViewer />
          </div>
        ) : (
          <AgentVisualization 
            isDark={isDark} 
            interactions={interactions}
            onPromptSubmit={handlePromptSubmit}
          />
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-md w-full`}>
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Dark Mode</span>
                <button 
                  className={`${isDark ? 'bg-blue-600' : 'bg-gray-300'} px-3 py-1 rounded`}
                  onClick={toggleTheme}
                >
                  {isDark ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            <button 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setIsSettingsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}