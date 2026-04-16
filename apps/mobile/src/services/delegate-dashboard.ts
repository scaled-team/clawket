import type { DelegateConnectionConfig } from './delegate-http-adapter';

export type DelegateDashboardData = {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string | null;
    color: string;
    isActive: boolean;
    orchestrationStatus: string;
    lastHeartbeat: string | null;
  }>;
  delegations: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    taskIdentifier: string | null;
    status: string;
    agentName: string | null;
    progress: number | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  messages: {
    total: number;
    recent: Array<{
      id: string;
      text: string;
      role: string;
      sender: string | null;
      timestamp: string;
      isAI: boolean;
    }>;
  };
  stats: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    totalAgents: number;
    activeAgents: number;
    totalDelegations: number;
    runningDelegations: number;
    failedDelegations: number;
    completedDelegations: number;
  };
  heartbeat: {
    lastSeen: string | null;
    status: 'online' | 'stale' | 'offline';
  };
};

export async function fetchDelegateDashboard(
  config: DelegateConnectionConfig,
): Promise<DelegateDashboardData | null> {
  try {
    const url = `${config.apiUrl.replace(/\/+$/, '')}/api/agent/dashboard`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Delegate wraps responses in { data: ... }
    return json.data ?? json;
  } catch {
    return null;
  }
}
