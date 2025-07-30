import React, { useState, useEffect } from 'react';
import { Agent, AgentConnection } from '../types/ai';

interface AgentTabsProps {
  agents: Agent[];
  onAgentSelect: (agent: Agent) => void;
  selectedAgent: Agent | null;
  onConnectionSelect?: (connection: AgentConnection) => void;
}

const AgentTabs: React.FC<AgentTabsProps> = ({
  agents,
  onAgentSelect,
  selectedAgent,
  onConnectionSelect
}) => {
  const [activeTab, setActiveTab] = useState<string>('agents');

  const handleConnectionClick = (connection: AgentConnection) => {
    if (onConnectionSelect) {
      onConnectionSelect(connection);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'agents'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'connections'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('connections')}
        >
          Connections
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'agents' && (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => onAgentSelect(agent)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{agent.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {agent.role}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {agent.connections?.length || 0} connections
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-2">
            {agents.flatMap(agent => 
              agent.connections?.map(connection => ({
                ...connection,
                sourceAgent: agent,
                targetAgent: agents.find(a => a.id === connection.targetAgentId)
              })) || []
            ).map((connection, index) => (
              <div
                key={`${connection.sourceAgent.id}-${connection.targetAgentId}-${index}`}
                className="p-3 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleConnectionClick(connection)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">
                      {connection.sourceAgent.name} → {connection.targetAgent?.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {connection.type}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {connection.messages?.length || 0} messages
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentTabs;