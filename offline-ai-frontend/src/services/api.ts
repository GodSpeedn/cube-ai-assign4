/**
 * API Service for Multi-Agent System
 * 
 * This service handles all communication with the backend multi-agent system.
 * It provides a unified interface for all agent interactions and workflow management.
 */

const API_BASE_URL = 'http://localhost:8000';

export interface ChatRequest {
  prompt: string;
  code_history?: string[];
  error_history?: string[];
}

export interface ChatResponse {
  type: 'coding' | 'error';
  message: string;
  code?: string;
  tests?: string;
  test_results?: string;
  tests_passed?: boolean;
  files_created?: string[];
  workflow_result?: any;
  success?: boolean;
}

export interface WorkflowRequest {
  task: string;
  agents: Array<{
    id: string;
    type: string;
    role: string;
    model?: string;
    model_config?: any;
  }>;
}

export interface WorkflowResponse {
  success: boolean;
  results?: any;
  message: string;
  error?: string;
}

export interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  message_type: 'task' | 'data' | 'request' | 'response' | 'error' | 'status';
  content: string;
  metadata?: any;
  timestamp: string;
}

export interface AgentStatus {
  agent_id: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'error';
  memory_size: number;
}

export interface WorkflowResult {
  workflow_id: string;
  status: string;
  agents: Record<string, AgentStatus>;
  message_history: AgentMessage[];
  total_messages: number;
}

/**
 * Test backend connection
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Backend connection test passed:', data);
      return true;
    } else {
      console.error('Backend connection test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend connection test error:', error);
    return false;
  }
}

/**
 * Main chat endpoint - uses the new multi-agent system
 */
export async function chatWithAgents(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

/**
 * Run a custom workflow with specific agents
 */
export async function runWorkflow(request: WorkflowRequest): Promise<WorkflowResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/run-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workflow request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Workflow API error:', error);
    throw error;
  }
}

/**
 * Update an agent's model
 */
export async function updateAgentModel(agentId: string, modelName: string, modelConfig?: any): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/update-agent-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        model_name: modelName,
        model_config: modelConfig
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update agent model: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update agent model API error:', error);
    throw error;
  }
}

/**
 * Get list of generated files
 */
export async function getGeneratedFiles(): Promise<{ files: string[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/list-files`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get files: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get files API error:', error);
    throw error;
  }
}

/**
 * Get file content
 */
export async function getFileContent(filename: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/generated/${filename}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get file content: ${response.status} - ${errorText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Get file content API error:', error);
    throw error;
  }
}

/**
 * Delete a generated file
 */
export async function deleteGeneratedFile(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generated/${filename}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete file: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Delete file API error:', error);
    throw error;
  }
}

/**
 * Run manual workflow
 */
export async function runManualFlow(prompt: string, boxes: any[], connections: any[]): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/run-manual-flow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        boxes,
        connections
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Manual flow failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Manual flow API error:', error);
    throw error;
  }
}

/**
 * Get example workflow configuration
 */
export async function getExampleWorkflow(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/example-workflow`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get example workflow: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get example workflow API error:', error);
    throw error;
  }
} 