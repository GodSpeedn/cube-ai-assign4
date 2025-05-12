/**
 * AgentVisualization Component
 * 
 * This component visualizes the interaction between different AI agents (Coordinator, Coder, Tester, Runner)
 * in a dynamic, interactive interface. It provides a visual representation of the communication flow
 * between agents and allows users to monitor their interactions in real-time.
 * 
 * Key Features:
 * - Interactive agent boxes that can be dragged and resized
 * - Dynamic connection lines showing communication paths
 * - Real-time message display for each agent
 * - Communication popup showing messages between connected agents
 * - Dark/light mode support
 * - Responsive layout
 */

import React, { useState, useRef, useEffect } from 'react';

interface AIBlock {
  type: 'coder' | 'tester' | 'coordinator' | 'runner';
  content: string;
  timestamp: string;
  id: string;
  name: string;
  iteration: number;
}

interface AgentVisualizationProps {
  isDark: boolean;
  interactions: AIBlock[];
  onPromptSubmit?: (prompt: string) => void;
}

interface BoxDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ConnectionPoint {
  x: number;
  y: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  path: string;
  centerPoint: ConnectionPoint;
}

declare const process: {
  env: {
    NODE_ENV: string;
  };
};

const AgentVisualization: React.FC<AgentVisualizationProps> = ({ 
  isDark, 
  interactions = [],
  onPromptSubmit 
}) => {
  // State management
  const [selectedBlock, setSelectedBlock] = useState<AIBlock | null>(null);
  const [prompt, setPrompt] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Box dimensions and positions
  const [boxSizes, setBoxSizes] = useState<Record<string, BoxDimensions>>({
    coder: { width: 400, height: 256, x: 50, y: 50 },
    tester: { width: 400, height: 256, x: 500, y: 50 },
    coordinator: { width: 500, height: 256, x: 250, y: 350 },
    runner: { width: 500, height: 256, x: 250, y: 650 }
  });

  // Interaction states
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Add new state for container dimensions
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0
  });

  /**
   * Calculates the center points of all agent boxes
   * Used for drawing connection lines
   */
  const getConnectionPoints = (): Record<string, ConnectionPoint> => {
    const points: Record<string, ConnectionPoint> = {};
    
    Object.entries(boxSizes).forEach(([id, box]) => {
      // Calculate center points based on box position and size
      points[id] = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };
    });

    return points;
  };

  /**
   * Generates a curved SVG path between two points
   * Creates a smooth Bezier curve for visual appeal
   */
  const getCurvedPath = (start: ConnectionPoint, end: ConnectionPoint): string => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Adjust control points based on the direction of the connection
    const isVertical = Math.abs(dy) > Math.abs(dx);
    
    if (isVertical) {
      // For vertical connections, curve horizontally
      const controlPoint1 = { x: start.x, y: start.y + dy * 0.5 };
      const controlPoint2 = { x: end.x, y: end.y - dy * 0.5 };
      return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`;
    } else {
      // For horizontal connections, curve vertically
      const controlPoint1 = { x: start.x + dx * 0.5, y: start.y };
      const controlPoint2 = { x: end.x - dx * 0.5, y: end.y };
      return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`;
    }
  };

  /**
   * Retrieves messages exchanged between two agents
   * Filters messages based on sender and receiver
   */
  const getCommunicationMessages = (from: string, to: string): AIBlock[] => {
    console.log('[COMM]', { from, to });
    const fromType = from.toLowerCase() as AIBlock['type'];
    const toType = to.toLowerCase() as AIBlock['type'];
    
    // Get all messages between these two agents
    const messages = interactions.filter(block => {
      // For Coordinator-Coder communication
      if (fromType === 'coordinator' && toType === 'coder') {
        return block.type === 'coordinator' || block.type === 'coder';
      }
      
      // For Coder-Coordinator communication
      if (fromType === 'coder' && toType === 'coordinator') {
        return block.type === 'coder' || block.type === 'coordinator';
      }
      
      // For Coordinator-Tester communication
      if (fromType === 'coordinator' && toType === 'tester') {
        return block.type === 'coordinator' || block.type === 'tester';
      }
      
      // For Tester-Coordinator communication
      if (fromType === 'tester' && toType === 'coordinator') {
        return block.type === 'tester' || block.type === 'coordinator';
      }
      
      // For Coordinator-Runner communication
      if (fromType === 'coordinator' && toType === 'runner') {
        return block.type === 'coordinator' || block.type === 'runner';
      }
      
      // For Runner-Coordinator communication
      if (fromType === 'runner' && toType === 'coordinator') {
        return block.type === 'runner' || block.type === 'coordinator';
      }
      
      return false;
    });

    // Sort messages by timestamp
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  /**
   * Extracts the actual content from a message, removing communication metadata
   */
  const extractContent = (content: string): string => {
    // Remove communication headers and metadata
    let cleanContent = content
        .replace(/^(Reporting to|Instructing) .*?:/g, '')
        .replace(/Current program state:.*$/gm, '')
        .replace(/Context:.*$/gm, '')
        .replace(/"requirements":.*$/gm, '')
        .replace(/"dependencies":.*$/gm, '')
        .replace(/"constraints":.*$/gm, '')
        .replace(/"previousResults":.*$/gm, '')
        .replace(/{.*}/g, '')
        .trim();

    // Extract code blocks with language
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks = [...cleanContent.matchAll(codeBlockRegex)];
    
    if (codeBlocks.length > 0) {
        // If there are code blocks, return them with proper formatting
        return codeBlocks.map(block => {
            const language = block[1] || 'python';
            const code = block[2].trim();
            return `Generated ${language} code:\n${code}`;
        }).join('\n\n');
    }

    // For test results
    if (cleanContent.includes('Test Results:')) {
        const testResults = cleanContent.split('Test Results:')[1].trim();
        return `Test Results:\n${testResults}`;
    }

    // For generated files
    if (cleanContent.includes('Generated file:')) {
        const fileContent = cleanContent.split('Generated file:')[1].trim();
        return `Generated file:\n${fileContent}`;
    }

    // For requirements breakdown
    if (cleanContent.includes('Breaking down requirements:')) {
        const requirements = cleanContent.split('Breaking down requirements:')[1].trim();
        return `Requirements Breakdown:\n${requirements}`;
    }

    // For test generation
    if (cleanContent.includes('Generating tests for:')) {
        const testGen = cleanContent.split('Generating tests for:')[1].trim();
        return `Test Generation:\n${testGen}`;
    }

    // For test execution
    if (cleanContent.includes('Executing tests:')) {
        const testExec = cleanContent.split('Executing tests:')[1].trim();
        return `Test Execution:\n${testExec}`;
    }

    // For other content, remove status messages
    if (cleanContent.match(/^(Starting|Ready|Complete|Finished)/i)) {
        return '';
    }

    return cleanContent;
  };

  /**
   * Groups messages into conversations based on timestamps
   * Messages within 5 seconds of each other are considered part of the same conversation
   */
  const groupMessagesByConversation = (messages: AIBlock[]): AIBlock[][] => {
    if (messages.length === 0) return [];
    
    const groups: AIBlock[][] = [];
    let currentGroup: AIBlock[] = [messages[0]];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      
      // If messages are within 5 seconds of each other, group them
      const currentTime = new Date(currentMessage.timestamp).getTime();
      const previousTime = new Date(previousMessage.timestamp).getTime();
      if (currentTime - previousTime <= 5000) {
        currentGroup.push(currentMessage);
      } else {
        groups.push(currentGroup);
        currentGroup = [currentMessage];
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  /**
   * Updates container dimensions on window resize
   * Ensures proper layout and connection line positioning
   */
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  /**
   * Handles mouse events for box resizing and dragging
   * Updates box positions and dimensions in real-time
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing && !isDragging) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      if (isResizing) {
        setBoxSizes(prev => ({
          ...prev,
          [isResizing]: {
            ...prev[isResizing],
            width: Math.max(300, prev[isResizing].width + deltaX),
            height: Math.max(200, prev[isResizing].height + deltaY)
          }
        }));
      } else if (isDragging) {
        setBoxSizes(prev => ({
          ...prev,
          [isDragging]: {
            ...prev[isDragging],
            x: Math.max(0, prev[isDragging].x + deltaX),
            y: Math.max(0, prev[isDragging].y + deltaY)
          }
        }));
      }

      setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      setIsDragging(null);
    };

    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isDragging, startPos]);

  /**
   * Retrieves all message blocks for a specific agent type
   */
  const getBlocks = (type: AIBlock['type']) => {
    return interactions.filter(b => b.type === type);
  };

  /**
   * Handles prompt submission from the user
   */
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && onPromptSubmit) {
      onPromptSubmit(prompt.trim());
      setPrompt('');
    }
  };

  /**
   * Initiates box resizing
   */
  const startResize = (e: React.MouseEvent, boxId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(boxId);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  /**
   * Initiates box dragging
   */
  const startDrag = (e: React.MouseEvent, boxId: string) => {
    e.preventDefault();
    setIsDragging(boxId);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  /**
   * Resize handle component for agent boxes
   */
  const ResizeHandle = ({ boxId }: { boxId: string }) => (
    <div
      className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize ${
        isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
      }`}
      onMouseDown={(e) => startResize(e, boxId)}
    >
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-current" />
    </div>
  );

  // Update container dimensions when boxes move
  useEffect(() => {
    const calculateContainerDimensions = () => {
      const allBoxes = Object.values(boxSizes);
      const minX = Math.min(...allBoxes.map(box => box.x));
      const maxX = Math.max(...allBoxes.map(box => box.x + box.width));
      const minY = Math.min(...allBoxes.map(box => box.y));
      const maxY = Math.max(...allBoxes.map(box => box.y + box.height));

      // Add padding
      const padding = 100;
      const width = Math.max(maxX - minX + padding * 2, dimensions.width);
      const height = Math.max(maxY - minY + padding * 2, dimensions.height);

      setContainerDimensions({
        width,
        height,
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding
      });
    };

    calculateContainerDimensions();
  }, [boxSizes, dimensions]);

  /**
   * Connection lines component
   * Renders the visual connections between agents
   */
  const ConnectionLines = () => {
    const points = getConnectionPoints();
    const connections: Connection[] = [
      {
        id: 'coder-coordinator',
        from: 'Coder',
        to: 'Coordinator',
        path: getCurvedPath(points.coder, points.coordinator),
        centerPoint: {
          x: (points.coder.x + points.coordinator.x) / 2,
          y: (points.coder.y + points.coordinator.y) / 2
        }
      },
      {
        id: 'tester-coordinator',
        from: 'Tester',
        to: 'Coordinator',
        path: getCurvedPath(points.tester, points.coordinator),
        centerPoint: {
          x: (points.tester.x + points.coordinator.x) / 2,
          y: (points.tester.y + points.coordinator.y) / 2
        }
      },
      {
        id: 'coordinator-runner',
        from: 'Coordinator',
        to: 'Runner',
        path: getCurvedPath(points.coordinator, points.runner),
        centerPoint: {
          x: (points.coordinator.x + points.runner.x) / 2,
          y: (points.coordinator.y + points.runner.y) / 2
        }
      }
    ];
    
    return (
      <svg 
        className="absolute pointer-events-none"
        style={{
          left: containerDimensions.minX,
          top: containerDimensions.minY,
          width: containerDimensions.width,
          height: containerDimensions.height,
          zIndex: 0
        }}
      >
        {connections.map(connection => (
          <g key={connection.id} className="pointer-events-auto">
            <path
              d={connection.path}
              stroke={isDark ? '#4a4a4a' : '#888'}
              strokeWidth={selectedConnection?.id === connection.id || hoveredConnection === connection.id ? 4 : 2}
              fill="none"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
              onClick={(e) => {
                console.log('[CLICK]', connection.id, 'centerPoint=', connection.centerPoint);
                e.preventDefault();
                e.stopPropagation();
                setSelectedConnection(connection);
              }}
            />
            <circle
              cx={connection.centerPoint.x}
              cy={connection.centerPoint.y}
              r={selectedConnection?.id === connection.id || hoveredConnection === connection.id ? 6 : 4}
              fill={isDark ? '#4a4a4a' : '#888'}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
              onClick={(e) => {
                console.log('[CLICK]', connection.id, 'centerPoint=', connection.centerPoint);
                e.preventDefault();
                e.stopPropagation();
                setSelectedConnection(connection);
              }}
            />
          </g>
        ))}
      </svg>
    );
  };

  /**
   * Communication popup component
   * Shows messages exchanged between connected agents
   */
  const CommunicationPopup = () => {
    if (!selectedConnection) return null;

    const messages = getCommunicationMessages(selectedConnection.from, selectedConnection.to);
    const conversationGroups = groupMessagesByConversation(messages);
    const centerPoint = selectedConnection.centerPoint;

    // Calculate popup position to ensure it's always visible within the container
    const popupWidth = 500; // Increased width for better formatting
    const popupHeight = 400; // Increased height for better visibility
    
    // Get container bounds
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return null;

    // Calculate position relative to container
    let left = centerPoint.x;
    let top = centerPoint.y;

    // Adjust position to keep popup within container bounds
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;
    const containerRight = containerRect.right;
    const containerBottom = containerRect.bottom;

    // Convert to viewport coordinates
    const viewportLeft = left + containerLeft;
    const viewportTop = top + containerTop;

    // Adjust if popup would go outside container
    if (viewportLeft + popupWidth/2 > containerRight) {
      left = containerRight - containerLeft - popupWidth/2;
    }
    if (viewportLeft - popupWidth/2 < containerLeft) {
      left = containerLeft + popupWidth/2;
    }
    if (viewportTop + popupHeight/2 > containerBottom) {
      top = containerBottom - containerTop - popupHeight/2;
    }
    if (viewportTop - popupHeight/2 < containerTop) {
      top = containerTop + popupHeight/2;
    }

    return (
      <div 
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 ${
          isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
        } shadow-lg p-4`}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: popupWidth,
          zIndex: 1000,
          maxHeight: '80vh',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <h3 className="font-semibold text-lg">
            {selectedConnection.from} ↔ {selectedConnection.to}
          </h3>
          <button
            onClick={() => setSelectedConnection(null)}
            className={`p-1 rounded ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            ✕
          </button>
        </div>
        <div className={`overflow-y-auto ${isDark ? 'text-gray-300' : 'text-gray-700'}`} style={{ maxHeight: 'calc(80vh - 4rem)' }}>
          {conversationGroups.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No messages exchanged between these agents yet.
            </div>
          ) : (
            conversationGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6 last:mb-0">
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-2`}>
                  {new Date(group[0].timestamp).toLocaleTimeString()}
                </div>
                <div className={`space-y-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
                  {group.map((message) => (
                    <div key={message.id} className="relative">
                      <div className={`font-medium mb-1 ${
                        message.type === 'coordinator' ? 'text-blue-400' :
                        message.type === 'coder' ? 'text-green-400' :
                        message.type === 'tester' ? 'text-yellow-400' :
                        'text-purple-400'
                      }`}>
                        {message.name}
                      </div>
                      <div className="text-sm">
                        {message.content.split('\n').map((line, i) => {
                          if (line.includes('Current program state:') || 
                              line.includes('Context:') ||
                              line.includes('```')) {
                            return null;
                          }
                          return <div key={i}>{line}</div>;
                        })}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  /**
   * Individual agent box component
   * Displays agent messages and handles interactions
   */
  const AgentBox = ({ id, title, type }: { id: string; title: string; type: AIBlock['type'] }) => (
    <div 
      className={`absolute rounded-lg border-2 ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'} shadow-lg`}
      style={{ 
        width: boxSizes[id].width, 
        height: boxSizes[id].height,
        left: boxSizes[id].x,
        top: boxSizes[id].y
      }}
    >
      <div 
        className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} font-semibold select-none cursor-move`}
        onMouseDown={(e) => startDrag(e, id)}
      >
        {title}
      </div>
      <div className="p-3 h-[calc(100%-3rem)] overflow-y-auto select-text">
        {getBlocks(type).map((block, index) => {
          const content = extractContent(block.content);
          if (!content) return null;
          
          return (
            <div key={block.id} className="mb-3">
              <pre className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap font-mono bg-opacity-10 ${
                isDark ? 'bg-gray-700' : 'bg-gray-100'
              } p-2 rounded`}>
                {content}
              </pre>
              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                {new Date(block.timestamp).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>
      <ResizeHandle boxId={id} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Prompt Input Section */}
      <div className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
        <form onSubmit={handlePromptSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt for the Coordinator AI..."
            className={`flex-1 p-2 rounded ${
              isDark 
                ? 'bg-gray-700 text-white placeholder-gray-400' 
                : 'bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              isDark 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            Send
          </button>
        </form>
      </div>

      {/* Main Visualization Container */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <div 
          className={`relative rounded-lg border-2 ${
            isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-white/50'
          }`}
          style={{
            width: containerDimensions.width,
            height: containerDimensions.height,
            minWidth: '100%',
            minHeight: '800px'
          }}
          onClick={() => setSelectedConnection(null)}
        >
          {process.env.NODE_ENV === 'development' && (
            <div
              className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-700/80 text-xs font-mono overflow-auto max-h-40 w-64 z-50">
              <strong>RAW INTERACTIONS:</strong>
              <pre>{JSON.stringify(interactions, null, 2)}</pre>
              <strong>POINTS:</strong>
              <pre>{JSON.stringify(getConnectionPoints(), null, 2)}</pre>
              <strong>SELECTED:</strong> {selectedConnection?.id ?? '–'}
            </div>
          )}
          <ConnectionLines />
          <div className="relative z-10">
            <AgentBox id="coder" title="Coder Agent (Mistral)" type="coder" />
            <AgentBox id="tester" title="Tester Agent (Phi)" type="tester" />
            <AgentBox id="coordinator" title="Coordinator Agent" type="coordinator" />
            <AgentBox id="runner" title="Runner Agent (Llama3.2)" type="runner" />
          </div>
          <CommunicationPopup />
        </div>
      </div>
    </div>
  );
};

export default AgentVisualization; 