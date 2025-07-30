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
import ManualAgentCanvas from "./components/ManualAgentCanvas";
import { chatWithAgents, ChatRequest, ChatResponse, testBackendConnection } from "./services/api";
import "./styles/animations.css";

/**
 * Represents a single message block from an AI agent
 */
interface AIBlock {
  id: string;
  name: string;
  type: 'coordinator' | 'coder' | 'tester' | 'runner';
  content: string;
  timestamp: string;
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
  testsPassedStatus: boolean | null; // Track whether tests actually passed or failed
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
  const [activeTab, setActiveTab] = useState<'code' | 'ai' | 'manual'>('code');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [interactions, setInteractions] = useState<AIBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [programState, setProgramState] = useState<ProgramState>({
    currentPhase: 'idle',
    generatedCode: null,
    generatedTests: null,
    testResults: null,
    testsPassedStatus: null,
    lastAction: 'Initialized',
    context: {
      requirements: [],
      dependencies: [],
      constraints: [],
      previousResults: []
    }
  });

  // Test backend connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const connected = await testBackendConnection();
        setBackendConnected(connected);
      } catch (error) {
        console.error('Backend connection test failed:', error);
        setBackendConnected(false);
      }
    };

    testConnection();
    
    // Test connection every 30 seconds
    const interval = setInterval(testConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Example interaction data - replace with actual API calls
  useEffect(() => {
    const exampleInteractions: AIBlock[] = [
      {
        id: '1',
        name: 'Coordinator Agent',
        type: 'coordinator',
        content: 'Ready to coordinate AI tasks...',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        iteration: 1
      },
      {
        id: '2',
        name: 'Coder Agent (Mistral)',
        type: 'coder',
        content: 'Ready to generate and refine code...',
        timestamp: new Date(Date.now() - 4000).toISOString(),
        iteration: 1
      },
      {
        id: '3',
        name: 'Tester Agent (Phi)',
        type: 'tester',
        content: 'Ready to generate unit tests...',
        timestamp: new Date(Date.now() - 3000).toISOString(),
        iteration: 1
      },
      {
        id: '4',
        name: 'Runner Agent (Llama3.2)',
        type: 'runner',
        content: 'Ready to run tests and report outcomes...',
        timestamp: new Date(Date.now() - 2000).toISOString(),
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
    
    // Check if backend is connected
    if (backendConnected === false) {
      const errorInteraction: AIBlock = {
        id: Date.now().toString(),
        name: 'AI Coordinator',
        type: 'coordinator',
        content: `❌ Cannot process request: Backend is disconnected\n\nPlease ensure the backend server is running at http://localhost:8000`,
        timestamp: new Date().toISOString(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, errorInteraction]);
      return;
    }
    
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
      name: 'AI Coordinator',
      type: 'coordinator',
      content: `Starting new task: "${prompt}"\nGenerating code and tests...`,
      timestamp: new Date().toISOString(),
      iteration: interactions.length + 1
    };
    setInteractions(prev => [...prev, coordinatorStart]);

    try {
      // Use the new unified API service
      const chatRequest: ChatRequest = {
        prompt: prompt,
        code_history: programState.context.previousResults,
        error_history: []
      };

      console.log('Sending request:', chatRequest);
      const chatResponseData: ChatResponse = await chatWithAgents(chatRequest);
      console.log('Chat response:', chatResponseData);

      // Check if the request was successful - look for actual data rather than success field
      if (chatResponseData.type === 'error' && !chatResponseData.code && !chatResponseData.tests) {
        throw new Error(chatResponseData.message || 'Unknown error occurred');
      }

      // Extract data from multi-agent response
      const { code: generatedCode, tests: generatedTests, test_results: testResults, tests_passed: testsPassedFlag, message } = chatResponseData;
      
      console.log('Extracted data:', {
        generatedCode: !!generatedCode,
        generatedTests: !!generatedTests,
        testResults: !!testResults,
        testsPassedFlag,
        message
      });

      // Add coder's response if code was generated
      if (generatedCode) {
        const coderResponse: AIBlock = {
          id: (Date.now() + 1).toString(),
          name: 'AI Agent (Mistral)',
          type: 'coder',
          content: `Generated code for the task:\n\`\`\`python\n${generatedCode}\n\`\`\``,
          timestamp: new Date().toISOString(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, coderResponse]);
      }

      // Add tester's response if tests were generated
      if (generatedTests) {
        const testerResponse: AIBlock = {
          id: (Date.now() + 2).toString(),
          name: 'Test Generator',
          type: 'tester',
          content: `Generated test cases:\n\`\`\`python\n${generatedTests}\n\`\`\``,
          timestamp: new Date().toISOString(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, testerResponse]);
      }

      // Add runner's response if tests were executed
      if (testResults) {
        const runnerResponse: AIBlock = {
          id: (Date.now() + 3).toString(),
          name: 'Test Runner',
          type: 'runner',
          content: `Test execution results:\n\n${testResults}`,
          timestamp: new Date().toISOString(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, runnerResponse]);
      }

      // Add error message if test generation failed
      if (chatResponseData.type === 'error') {
        const errorResponse: AIBlock = {
          id: (Date.now() + 2.5).toString(),
          name: 'Test Generator',
          type: 'tester',
          content: `❌ Test generation failed: ${chatResponseData.message}`,
          timestamp: new Date().toISOString(),
          iteration: interactions.length + 1
        };
        setInteractions(prev => [...prev, errorResponse]);
      }

      // Update state with results
      setProgramState(prev => ({
        ...prev,
        currentPhase: 'complete',
        generatedCode: generatedCode || null,
        generatedTests: generatedTests || null,
        testResults: testResults || null,
        testsPassedStatus: testsPassedFlag || null,
        lastAction: message || 'Task completed',
        context: {
          ...prev.context,
          previousResults: [...prev.context.previousResults, message || 'Task completed']
        }
      }));

      // Add final coordinator summary with proper success status
      const codeStatus = generatedCode ? '✅ Generated' : '❌ Failed';
      const testsStatus = generatedTests ? '✅ Generated' : '❌ Failed';
      const testResultsStatus = testsPassedFlag === true ? '✅ Passed' : 
                                testsPassedFlag === false ? '❌ Failed' : 
                                testResults ? '⚠️ Available' : 
                                generatedTests ? '⚠️ Generated (not executed)' : '❌ Failed';
      
      const coordinatorSummary: AIBlock = {
        id: (Date.now() + 4).toString(),
        name: 'AI Coordinator',
        type: 'coordinator',
        content: `Task completed!\n\nFinal Status:\n- Code: ${codeStatus}\n- Tests: ${testsStatus}\n- Test Results: ${testResultsStatus}\n\nAll artifacts have been saved and are available for review.`,
        timestamp: new Date().toISOString(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, coordinatorSummary]);

    } catch (error: unknown) {
      console.error('Error:', error);
      // Add error interaction
      const errorInteraction: AIBlock = {
        id: Date.now().toString(),
        name: 'AI Coordinator',
        type: 'coordinator',
        content: `❌ Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check that:\n1. The backend server is running\n2. Ollama is running with the mistral model\n3. Your network connection is stable`,
        timestamp: new Date().toISOString(),
        iteration: interactions.length + 1
      };
      setInteractions(prev => [...prev, errorInteraction]);
      
      // Update state to show error
      setProgramState(prev => ({
        ...prev,
        currentPhase: 'idle',
        lastAction: 'Error occurred',
        context: {
          ...prev.context,
          previousResults: [...prev.context.previousResults, 'Error occurred']
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`h-screen w-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} text-${isDark ? 'white' : 'gray-900'} flex flex-col overflow-hidden transition-colors duration-200`}>
      {/* Top Bar */}
      <div className={`p-4 flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-xl font-bold">Offline AI Coding Assistant</h1>
        <div className="flex space-x-4 items-center">
          {/* Backend Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded text-sm ${
            backendConnected === null ? 'bg-yellow-100 text-yellow-800' :
            backendConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              backendConnected === null ? 'bg-yellow-500' :
              backendConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>
              {backendConnected === null ? 'Connecting...' :
               backendConnected ? 'Backend Connected' : 'Backend Disconnected'}
            </span>
          </div>
          
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
        <button
          className={`px-4 py-2 ${activeTab === 'manual' ? (isDark ? 'bg-gray-800' : 'bg-gray-200') : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Agent
        </button>
                </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' ? (
          <div className="flex h-full">
            <FileTree />
            <CodeViewer />
          </div>
        ) : activeTab === 'ai' ? (
          <AgentVisualization 
            isDark={isDark} 
            interactions={interactions}
            onPromptSubmit={handlePromptSubmit}
          />
        ) : (
          <ManualAgentCanvas isDark={isDark} />
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