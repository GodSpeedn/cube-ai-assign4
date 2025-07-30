import React, { useState, useRef, useEffect } from 'react';
import { runManualFlow } from '../services/api';

export type AgentType = 'coordinator' | 'coder' | 'tester' | 'runner' | 'custom';

interface AgentMessage {
  id: string;
  agentId: string;
  agentType: string;
  agentName: string;
  content: string;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
}

type BoxSide = 'left' | 'right' | 'top' | 'bottom';

interface ManualAgentBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  agentType: AgentType;
  role: string;
  model?: string;
}

interface ManualAgentConnection {
  id: string;
  fromId: string;
  fromSide: BoxSide;
  toId: string;
  toSide: BoxSide;
}

interface ManualAgentCanvasProps {
  isDark: boolean;
}

const agentTypeOptions = [
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'coder', label: 'Coder' },
  { value: 'tester', label: 'Tester' },
  { value: 'runner', label: 'Runner' },
  { value: 'custom', label: 'Custom' },
];

const modelOptions = [
  { value: 'mistral', label: 'Mistral' },
  { value: 'phi', label: 'Phi' },
  { value: 'llama3.2:3b', label: 'Llama3.2:3b' },
  { value: 'custom', label: 'Custom' },
];

const roleOptions = [
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'coder', label: 'Coder' },
  { value: 'tester', label: 'Tester' },
  { value: 'runner', label: 'Runner' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other...' },
];

const DEFAULT_BOX = { width: 300, height: 100 };

const handleOffsets = {
  left:  { x: 0, y: 0.5 },
  right: { x: 1, y: 0.5 },
  top:   { x: 0.5, y: 0 },
  bottom:{ x: 0.5, y: 1 },
};

const ManualAgentCanvas: React.FC<ManualAgentCanvasProps> = ({ isDark }) => {
  const [boxes, setBoxes] = useState<ManualAgentBox[]>([]);
  const [connections, setConnections] = useState<ManualAgentConnection[]>([]);
  const [connectDrag, setConnectDrag] = useState<null | {
    fromId: string;
    fromSide: BoxSide;
    mouse: { x: number; y: number };
  }>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeBox, setResizeBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [dragOverHandle, setDragOverHandle] = useState<{ boxId: string; side: BoxSide } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Store popup position and size per connection
  const [popupStates, setPopupStates] = useState<Record<string, { x?: number; y?: number; width?: number; height?: number }>>({});
  const DEFAULT_POPUP = { width: 300, height: 180 };
  const [resizingPopup, setResizingPopup] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [draggingPopup, setDraggingPopup] = useState<{ id: string; offsetX: number; offsetY: number }>();

  // Pin state for agent boxes
  const [pinnedBoxes, setPinnedBoxes] = useState<Record<string, boolean>>({});

  // Agent messages and workflow state
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customRoleFocusBoxId, setCustomRoleFocusBoxId] = useState<string | null>(null);
  const customRoleInputRef = useRef<HTMLInputElement>(null);

  // Focus custom role input when needed
  useEffect(() => {
    if (customRoleFocusBoxId && customRoleInputRef.current) {
      customRoleInputRef.current.focus();
    }
  }, [customRoleFocusBoxId]);

  // Placeholder for running the flow
  const [prompt, setPrompt] = useState('');
  const handleRunFlow = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    if (boxes.length === 0) {
      alert('Please create at least one agent box');
      return;
    }

    setIsRunning(true);
    setAgentMessages([]);

    try {
      const data = await runManualFlow(prompt.trim(), boxes, connections);
      setAgentMessages(data.messages || []);

      if (data.generated_files && data.generated_files.length > 0) {
        console.log('Generated files:', data.generated_files);
      }

    } catch (error) {
      console.error('Error running flow:', error);
      alert('Error running flow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  // Add box at default position
  const handleCreateBox = () => {
    setBoxes(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        x: 50,
        y: 50,
        width: DEFAULT_BOX.width,
        height: DEFAULT_BOX.height,
        agentType: 'coordinator',
        role: '',
      },
    ]);
  };

  // Update box fields
  const handleBoxChange = (id: string, field: keyof ManualAgentBox, value: any) => {
    setBoxes(prev => prev.map(box => box.id === id ? { ...box, [field]: value } : box));
  };

  // Drag logic
  const handleBoxMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const box = boxes.find(b => b.id === id);
    if (box) {
      setDragId(id);
      setOffset({ x: e.clientX - box.x, y: e.clientY - box.y });
    }
  };

  // Resize logic
  const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const box = boxes.find(b => b.id === id);
    if (box) {
      setResizeId(id);
      setResizeStart({ x: e.clientX, y: e.clientY });
      setResizeBox({ width: box.width, height: box.height });
    }
  };

  // Connection handle drag start
  const handleHandleMouseDown = (e: React.MouseEvent, boxId: string, side: BoxSide) => {
    e.stopPropagation();
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    const { x, y, width, height } = box;
    const handleX = x + width * handleOffsets[side].x;
    const handleY = y + height * handleOffsets[side].y;
    setConnectDrag({ fromId: boxId, fromSide: side, mouse: { x: handleX, y: handleY } });
  };

  // Mouse move for drag/resize/connect
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (resizeId) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      setBoxes(prev => prev.map(box =>
        box.id === resizeId
          ? { ...box, width: Math.max(120, resizeBox.width + dx), height: Math.max(60, resizeBox.height + dy) }
          : box
      ));
      return;
    }
    if (dragId) {
      setBoxes(prev => prev.map(box =>
        box.id === dragId ? { ...box, x: e.clientX - offset.x, y: e.clientY - offset.y } : box
      ));
      return;
    }
    if (connectDrag) {
      setConnectDrag({ ...connectDrag, mouse: { x: e.clientX, y: e.clientY } });
    }
  };

  // Improved Bezier curve for connections (direction-aware, like AgentVisualization)
  const getSmartBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let c1x = x1, c1y = y1, c2x = x2, c2y = y2;
    if (absDx > absDy) {
      // Horizontal-ish
      c1x = x1 + dx * 0.5;
      c2x = x2 - dx * 0.5;
    } else {
      // Vertical-ish
      c1y = y1 + dy * 0.5;
      c2y = y2 - dy * 0.5;
    }
    return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  };

  // Get messages for a specific connection
  const getConnectionMessages = (conn: ManualAgentConnection, from: ManualAgentBox, to: ManualAgentBox): AgentMessage[] => {
    return agentMessages.filter(message => 
      message.agentId === from.id || message.agentId === to.id
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Render popup/modal for a connection
  const renderPopupForConnection = (conn: ManualAgentConnection, from: ManualAgentBox, to: ManualAgentBox, centerX: number, centerY: number) => {
    if (selectedConnectionId !== conn.id) return null;
    const popupState = popupStates[conn.id] || {};
    const width = typeof popupState.width === 'number' ? popupState.width : DEFAULT_POPUP.width;
    const height = typeof popupState.height === 'number' ? popupState.height : DEFAULT_POPUP.height;
    const x = typeof popupState.x === 'number' ? popupState.x : Math.max(0, centerX - width / 2);
    const y = typeof popupState.y === 'number' ? popupState.y : Math.max(0, centerY - height / 2);
    
    const connectionMessages = getConnectionMessages(conn, from, to);
    
    return (
      <foreignObject
        key={conn.id + '-popup'}
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ pointerEvents: 'auto', zIndex: 1000, overflow: 'visible' }}
      >
        <div
          style={{
            background: isDark ? '#23272F' : '#fff',
            color: isDark ? '#fff' : '#222',
            border: '2px solid #f97316',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            padding: 18,
            minWidth: 220,
            minHeight: 80,
            width,
            height,
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            cursor: draggingPopup && draggingPopup.id === conn.id ? 'grabbing' : 'move',
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => handlePopupDragMouseDown(e, conn.id)}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'center', borderBottom: `1px solid ${isDark ? '#444' : '#ddd'}`, paddingBottom: 8 }}>
            📡 Agent Communication
            <div style={{ fontSize: 11, fontWeight: 400, color: isDark ? '#888' : '#666', marginTop: 2 }}>
              {from.agentType} ↔ {to.agentType}
            </div>
          </div>
          
          {/* Enhanced Messages area */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            marginBottom: 12,
            border: `1px solid ${isDark ? '#444' : '#ddd'}`,
            borderRadius: 6,
            padding: 8,
            fontSize: 12
          }}>
            {connectionMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: isDark ? '#888' : '#666', fontStyle: 'italic', padding: '20px 0' }}>
                💬 No messages yet
                <div style={{ fontSize: 10, marginTop: 4 }}>
                  Run the workflow to see agent communication
                </div>
              </div>
            ) : (
              connectionMessages.map((message, index) => {
                const isCommand = message.content.includes('generate') || message.content.includes('create') || message.content.includes('run');
                const isResponse = message.content.includes('```') || message.content.includes('Generated') || message.content.includes('Complete');
                
                return (
                  <div key={message.id} style={{ 
                    marginBottom: 12, 
                    paddingBottom: 8, 
                    borderBottom: index < connectionMessages.length - 1 ? `1px solid ${isDark ? '#333' : '#eee'}` : 'none',
                    borderLeft: isCommand ? '3px solid #3b82f6' : isResponse ? '3px solid #10b981' : '3px solid #6b7280',
                    paddingLeft: 8,
                    background: isCommand ? (isDark ? '#1e3a8a20' : '#dbeafe') : 
                               isResponse ? (isDark ? '#064e3b20' : '#dcfce7') : 
                               (isDark ? '#1a1a1a' : '#f8f8f8'),
                    borderRadius: '0 6px 6px 0'
                  }}>
                    <div style={{ 
                      fontWeight: 600, 
                      marginBottom: 4, 
                      color: '#f97316',
                      fontSize: 11,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{message.agentName}</span>
                      {isCommand && <span style={{ fontSize: 9, background: '#3b82f6', color: 'white', padding: '1px 4px', borderRadius: 2 }}>CMD</span>}
                      {isResponse && <span style={{ fontSize: 9, background: '#10b981', color: 'white', padding: '1px 4px', borderRadius: 2 }}>RESP</span>}
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      lineHeight: 1.4,
                      maxHeight: 80,
                      overflow: 'auto',
                      background: isDark ? '#00000020' : '#ffffff60',
                      padding: 6,
                      borderRadius: 4,
                      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`
                    }}>
                      {/* Show instruction type if detected */}
                      {isCommand && message.content.includes('generate') && (
                        <div style={{ 
                          fontSize: 9, 
                          fontFamily: 'monospace', 
                          background: '#3b82f6', 
                          color: 'white', 
                          padding: '2px 4px', 
                          borderRadius: 2, 
                          marginBottom: 4,
                          display: 'inline-block'
                        }}>
                          {message.content.includes('code') ? 'GENERATE CODE' : 
                           message.content.includes('test') ? 'GENERATE TESTS' : 'EXECUTE TASK'}
                        </div>
                      )}
                      
                      {/* Message content */}
                      <div>
                        {message.content.length > 150 
                          ? message.content.substring(0, 150) + '...'
                          : message.content
                        }
                      </div>
                      
                      {/* Show code preview indicator */}
                      {message.content.includes('```') && (
                        <div style={{ 
                          fontSize: 9, 
                          color: isDark ? '#10b981' : '#059669', 
                          marginTop: 4,
                          fontStyle: 'italic'
                        }}>
                          💻 Code generated (click to expand)
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: isDark ? '#888' : '#666', marginTop: 4 }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
              onClick={() => {
                setConnections(prev => prev.filter(c => c.id !== conn.id));
                setSelectedConnectionId(null);
              }}
            >
              Delete
            </button>
            <button
              style={{ background: isDark ? '#444' : '#eee', color: isDark ? '#fff' : '#222', border: 'none', borderRadius: 6, padding: '4px 8px', fontWeight: 500, cursor: 'pointer', fontSize: 12 }}
              onClick={() => setSelectedConnectionId(null)}
            >
              Close
            </button>
          </div>
          
          {/* Resize handle */}
          <div
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 18,
              height: 18,
              cursor: 'se-resize',
              zIndex: 10,
              background: 'transparent',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
            onMouseDown={e => handlePopupResizeMouseDown(e, conn.id)}
          >
            <div style={{ width: 14, height: 14, borderRight: '3px solid #f97316', borderBottom: '3px solid #f97316', borderRadius: 2, background: isDark ? '#23272F' : '#fff', position: 'absolute', right: 2, bottom: 2 }} />
          </div>
        </div>
      </foreignObject>
    );
  };

  // Render connections as SVG paths
  const renderConnections = () => (
    <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: 'auto' }}>
      {connections.map(conn => {
        const from = boxes.find(b => b.id === conn.fromId);
        const to = boxes.find(b => b.id === conn.toId);
        if (!from || !to) return null;
        const fromX = from.x + from.width * handleOffsets[conn.fromSide].x;
        const fromY = from.y + from.height * handleOffsets[conn.fromSide].y;
        const toX = to.x + to.width * handleOffsets[conn.toSide].x;
        const toY = to.y + to.height * handleOffsets[conn.toSide].y;
        // Center point for popup
        const centerX = (fromX + toX) / 2;
        const centerY = (fromY + toY) / 2;
        return (
          <g key={conn.id}>
            <path
              d={getSmartBezierPath(fromX, fromY, toX, toY)}
              stroke="#f97316"
              strokeWidth={3}
              fill="none"
              markerEnd="url(#arrowhead)"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onClick={e => { e.stopPropagation(); setSelectedConnectionId(conn.id); }}
            />
            {renderPopupForConnection(conn, from, to, centerX, centerY)}
          </g>
        );
      })}
      {/* Temporary connection line while dragging */}
      {connectDrag && (() => {
        const from = boxes.find(b => b.id === connectDrag.fromId);
        if (!from) return null;
        const fromX = from.x + from.width * handleOffsets[connectDrag.fromSide].x;
        const fromY = from.y + from.height * handleOffsets[connectDrag.fromSide].y;
        return (
          <path
            d={getSmartBezierPath(fromX, fromY, connectDrag.mouse.x, connectDrag.mouse.y)}
            stroke="#f97316"
            strokeWidth={2}
            fill="none"
            strokeDasharray="6 4"
            markerEnd="url(#arrowhead)"
          />
        );
      })()}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
        </marker>
      </defs>
    </svg>
  );

  // Render connection handles for a box
  const renderHandles = (box: ManualAgentBox) => {
    // Show handles only on hover or when dragging a connection from this box
    const show = hoveredBoxId === box.id || (connectDrag && connectDrag.fromId === box.id);
    return (
      (['left', 'right', 'top', 'bottom'] as BoxSide[]).map(side => {
        const hx = box.x + box.width * handleOffsets[side].x;
        const hy = box.y + box.height * handleOffsets[side].y;
        const isDragOver = dragOverHandle && dragOverHandle.boxId === box.id && dragOverHandle.side === side;
        return (
          <div
            key={side}
            style={{
              position: 'absolute',
              left: hx - box.x - 10,
              top: hy - box.y - 10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: show || isDragOver ? (isDragOver ? '#fb923c' : '#f97316') : 'transparent',
              border: show || isDragOver ? '2px solid #fff' : '2px solid transparent',
              boxShadow: show || isDragOver ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              cursor: 'pointer',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: show || isDragOver ? 1 : 0,
              transition: 'opacity 0.15s, background 0.15s, border 0.15s',
            }}
            onMouseDown={e => handleHandleMouseDown(e, box.id, side)}
            onMouseEnter={() => connectDrag && setDragOverHandle({ boxId: box.id, side })}
            onMouseLeave={() => connectDrag && setDragOverHandle(null)}
          />
        );
      })
    );
  };

  // Get messages for a specific agent box
  const getBoxMessages = (boxId: string): AgentMessage[] => {
    return agentMessages.filter(message => message.agentId === boxId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Render agent boxes
  const renderBoxes = () => (
    boxes.map(box => {
      // Role field logic
      const isStandardRole = roleOptions.some(opt => opt.value === box.role);
      const showDropdown = !box.role || isStandardRole;
      const showInput = !showDropdown;
      const boxMessages = getBoxMessages(box.id);
      const hasMessages = boxMessages.length > 0;
      const isActive = isRunning && hasMessages;
      
      return (
        <div
          key={box.id}
          style={{
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            background: isDark ? '#23272F' : '#fff',
            border: dragId === box.id || resizeId === box.id ? '2.5px solid #2563eb' : 
                   isActive ? '2px solid #10b981' : '2px solid #888',
            borderRadius: 12,
            boxShadow: dragId === box.id || resizeId === box.id ? '0 4px 16px rgba(37,99,235,0.15)' : 
                      isActive ? '0 4px 16px rgba(16,185,129,0.15)' : '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 2,
            padding: 12,
            cursor: pinnedBoxes[box.id] ? 'default' : dragId === box.id ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: 'box-shadow 0.15s, border 0.15s',
          }}
          onMouseDown={e => !pinnedBoxes[box.id] && handleBoxMouseDown(e, box.id)}
          onMouseEnter={() => setHoveredBoxId(box.id)}
          onMouseLeave={() => setHoveredBoxId(null)}
        >
          {renderHandles(box)}
          {/* All controls in a single row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, width: '100%' }}>
            <button
              style={{ background: 'none', border: 'none', color: isDark ? '#f97316' : '#f97316', fontSize: 18, cursor: 'pointer', zIndex: 10, padding: 0, marginRight: 2 }}
              title={pinnedBoxes[box.id] ? 'Unpin' : 'Pin'}
              onClick={e => { e.stopPropagation(); setPinnedBoxes(prev => ({ ...prev, [box.id]: !prev[box.id] })); }}
            >
              {pinnedBoxes[box.id] ? '📌' : '📍'}
            </button>
            <select
              value={box.agentType || ''}
              onChange={e => handleBoxChange(box.id, 'agentType', e.target.value as AgentType)}
              style={{
                background: isDark ? '#181A20' : '#f9f9f9',
                color: isDark ? '#fff' : '#222',
                border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 15,
                outline: 'none',
                minWidth: 110,
                transition: 'border 0.15s',
              }}
            >
              <option value="">Select Agent</option>
              <option value="coordinator">Coordinator</option>
              <option value="coder">Coder</option>
              <option value="tester">Tester</option>
              <option value="runner">Runner</option>
              <option value="custom">Custom</option>
            </select>
            {showDropdown && (
              <select
                value={isStandardRole ? box.role : 'other'}
                onChange={e => {
                  if (e.target.value === 'other') {
                    handleBoxChange(box.id, 'role', '');
                    setCustomRoleFocusBoxId(box.id);
                  } else {
                    handleBoxChange(box.id, 'role', e.target.value);
                    setCustomRoleFocusBoxId(null);
                  }
                }}
                style={{
                  background: isDark ? '#181A20' : '#f9f9f9',
                  color: isDark ? '#fff' : '#222',
                  border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 15,
                  outline: 'none',
                  minWidth: 90,
                  transition: 'border 0.15s',
                }}
              >
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {showInput && (
              <input
                ref={customRoleFocusBoxId === box.id ? customRoleInputRef : undefined}
                type="text"
                placeholder="Custom role"
                value={box.role}
                onChange={e => handleBoxChange(box.id, 'role', e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: '60%',
                  minWidth: 60,
                  boxSizing: 'border-box',
                  background: isDark ? '#181A20' : '#f9f9f9',
                  color: isDark ? '#fff' : '#222',
                  border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'border 0.15s',
                }}
              />
            )}
            <select
              value={box.model || 'mistral'}
              onChange={e => handleBoxChange(box.id, 'model', e.target.value)}
              style={{
                background: isDark ? '#181A20' : '#f9f9f9',
                color: isDark ? '#fff' : '#222',
                border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 15,
                outline: 'none',
                minWidth: 90,
                transition: 'border 0.15s',
              }}
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Messages display area */}
          {boxMessages.length > 0 && (
            <div style={{ 
              marginTop: 8, 
              padding: 8, 
              background: isDark ? '#1a1a1a' : '#f8f8f8',
              borderRadius: 6,
              maxHeight: 60,
              overflow: 'auto',
              fontSize: 11,
              border: `1px solid ${isDark ? '#333' : '#ddd'}`
            }}>
                             <div style={{ fontWeight: 600, marginBottom: 4, color: '#10b981' }}>
                 {(() => {
                   const lastMessage = boxMessages[boxMessages.length - 1];
                   const content = lastMessage?.content || '';
                   return `Latest: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`;
                 })()}
               </div>
              <div style={{ fontSize: 10, color: isDark ? '#888' : '#666' }}>
                {boxMessages.length} message{boxMessages.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          
          {/* Resize handle */}
          <div
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 18,
              height: 18,
              cursor: 'se-resize',
              zIndex: 10,
              background: 'transparent',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
            onMouseDown={e => handleResizeMouseDown(e, box.id)}
          >
            <div style={{ width: 14, height: 14, borderRight: '3px solid #2563eb', borderBottom: '3px solid #2563eb', borderRadius: 2, background: isDark ? '#23272F' : '#fff', position: 'absolute', right: 2, bottom: 2 }} />
          </div>
        </div>
      );
    })
  );

  // Mouse up to stop drag/resize/connect
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (connectDrag) {
      // Only connect if mouse is over a visible handle
      if (dragOverHandle && dragOverHandle.boxId !== connectDrag.fromId) {
        setConnections(prev => [
          ...prev,
          {
            id: connectDrag.fromId + '-' + dragOverHandle.boxId + '-' + connectDrag.fromSide + '-' + dragOverHandle.side,
            fromId: connectDrag.fromId,
            fromSide: connectDrag.fromSide,
            toId: dragOverHandle.boxId,
            toSide: dragOverHandle.side,
          },
        ]);
      }
      setConnectDrag(null);
      setDragOverHandle(null);
      return;
    }
    setDragId(null);
    setResizeId(null);
  };

  // Handle popup resize mouse down
  const handlePopupResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const size = popupStates[id] || DEFAULT_POPUP;
    setResizingPopup({ 
      id, 
      startX: e.clientX, 
      startY: e.clientY, 
      startW: size.width || DEFAULT_POPUP.width, 
      startH: size.height || DEFAULT_POPUP.height 
    });
  };

  // Handle popup resize mouse move
  const handlePopupResizeMouseMove = (e: React.MouseEvent) => {
    if (resizingPopup) {
      const dx = e.clientX - resizingPopup.startX;
      const dy = e.clientY - resizingPopup.startY;
      setPopupStates(prev => ({
        ...prev,
        [resizingPopup.id]: {
          ...prev[resizingPopup.id],
          width: Math.max(220, resizingPopup.startW + dx),
          height: Math.max(80, resizingPopup.startH + dy),
        },
      }));
    }
    handleCanvasMouseMove(e);
  };

  // Handle popup resize mouse up
  const handlePopupResizeMouseUp = (e: React.MouseEvent) => {
    if (resizingPopup) setResizingPopup(null);
    handleCanvasMouseUp(e);
  };

  // Handle popup drag mouse down
  const handlePopupDragMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const popup = popupStates[id] || DEFAULT_POPUP;
    setDraggingPopup({ 
      id, 
      offsetX: e.clientX - (popup.x || 0), 
      offsetY: e.clientY - (popup.y || 0) 
    });
  };

  // Handle popup drag mouse move
  const handlePopupDragMouseMove = (e: React.MouseEvent) => {
    if (draggingPopup) {
      setPopupStates(prev => ({
        ...prev,
        [draggingPopup.id]: {
          ...prev[draggingPopup.id],
          x: e.clientX - draggingPopup.offsetX,
          y: e.clientY - draggingPopup.offsetY,
          width: prev[draggingPopup.id]?.width || DEFAULT_POPUP.width,
          height: prev[draggingPopup.id]?.height || DEFAULT_POPUP.height,
        },
      }));
    }
    handlePopupResizeMouseMove(e);
  };

  // Handle popup drag mouse up
  const handlePopupDragMouseUp = (e: React.MouseEvent) => {
    if (draggingPopup) setDraggingPopup(undefined);
    handlePopupResizeMouseUp(e);
  };

  // Cancel connection drag on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectDrag(null);
        setDragOverHandle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cancel connection drag on canvas click (not on box/handle)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectDrag && e.target === canvasRef.current) {
      setConnectDrag(null);
      setDragOverHandle(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      style={{ width: '100%', height: '100%', position: 'relative', background: isDark ? '#181A20' : '#f4f4f4', cursor: 'default' }}
      onMouseMove={handlePopupDragMouseMove}
      onMouseUp={handlePopupDragMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Top controls row */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 0,
          width: '100%',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          pointerEvents: 'auto',
        }}
      >
        <button
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' }}
          onClick={handleCreateBox}
        >
          + Create an empty box
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: isDark ? 'rgba(30,32,40,0.95)' : 'rgba(255,255,255,0.95)',
            border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
            borderRadius: 10,
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            padding: '10px 18px',
            maxWidth: 520,
            minWidth: 320,
            flex: 1,
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter your prompt or command..."
            style={{
              flex: 1,
              background: isDark ? '#181A20' : '#fff',
              color: isDark ? '#fff' : '#222',
              border: isDark ? '1.5px solid #444' : '1.5px solid #bbb',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 16,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleRunFlow}
            disabled={isRunning}
            style={{ 
              background: isRunning ? '#94a3b8' : '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              padding: '8px 18px', 
              fontWeight: 600, 
              fontSize: 16, 
              cursor: isRunning ? 'not-allowed' : 'pointer', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
            }}
          >
            {isRunning ? 'Running...' : 'Run Flow'}
          </button>
        </div>
      </div>
      {/* Add top padding to canvas for agent boxes */}
      <div style={{ height: 70 }} />
      {renderConnections()}
      {renderBoxes()}
    </div>
  );
};

export default ManualAgentCanvas; 