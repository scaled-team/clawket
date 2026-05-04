import type { GatewayBackendCapabilities } from '../../services/gateway-backends';
import type { ConsoleStackParamList } from './sharedNavigator';

export function isConsoleScreenSupported(
  screen: keyof ConsoleStackParamList,
  capabilities: GatewayBackendCapabilities,
): boolean {
  switch (screen) {
    case 'ConsoleMenu':
    case 'Docs':
    case 'ChatHistory':
    case 'ChatHistoryDetail':
    case 'FavoriteMessageDetail':
    case 'SessionsBoard':
      return true;
    case 'AgentSessionsBoard':
      return capabilities.consoleAgentSessionsBoard;
    case 'Discover':
      return capabilities.consoleDiscover;
    case 'ClawHub':
      return capabilities.consoleClawHub;
    case 'FileList':
    case 'FileEditor':
      return capabilities.consoleFiles;
    case 'CronList':
    case 'CronDetail':
    case 'CronEditor':
    case 'CronWizard':
      return capabilities.consoleCron;
    case 'SkillList':
    case 'SkillDetail':
    case 'SkillContent':
      return capabilities.consoleSkills;
    case 'Logs':
      return capabilities.consoleLogs;
    case 'Usage':
      return capabilities.consoleUsage;
    case 'ModelList':
      return capabilities.modelCatalog;
    case 'Channels':
      return capabilities.consoleChannels;
    case 'Nodes':
    case 'Devices':
    case 'NodeDetail':
      return capabilities.consoleNodes;
    case 'ToolList':
      return capabilities.consoleTools && capabilities.configRead;
    case 'AgentList':
      return capabilities.consoleAgentList;
    case 'AgentDetail':
    case 'AgentUserInfo':
    case 'CreateAgent':
      return capabilities.consoleAgentDetail;
    case 'TaskList':
    case 'TaskDetail':
      return capabilities.consoleTasks;
    case 'CreateTask':
      return capabilities.consoleCreateTask;
    case 'BoardMeetings':
    case 'BoardMeetingDetail':
      return capabilities.consoleBoardMeetings;
    case 'CreateBoardMeeting':
      return capabilities.consoleCreateBoardMeeting;
    case 'Notifications':
      return capabilities.consoleNotifications;
    case 'HeartbeatSettings':
      return capabilities.consoleHeartbeat;
    case 'AdminMenu':
      return capabilities.consoleAdmin;
    case 'AdminUsers':
      return capabilities.consoleAdminUsers;
    case 'AdminWorkspaces':
      return capabilities.consoleAdminWorkspaces;
    case 'AdminBilling':
      return capabilities.consoleAdminBilling;
    case 'AdminAudit':
      return capabilities.consoleAdminAudit;
    case 'AdminSessions':
      return capabilities.consoleAdminSessions;
    case 'DelegateServerList':
      // Server-list belongs to the workspace admin surface, gated together
      // with other admin-workspace reads. Delegate enables it; OpenClaw +
      // Hermes leave `consoleAdminWorkspaces` false so the screen renders
      // the standard "Not Available Yet" empty state.
      return capabilities.consoleAdmin && capabilities.consoleAdminWorkspaces;
    default:
      return true;
  }
}
