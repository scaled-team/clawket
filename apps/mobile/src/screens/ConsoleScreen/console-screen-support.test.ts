import { isConsoleScreenSupported } from './console-screen-support';
import type { GatewayBackendCapabilities } from '../../services/gateway-backends';

describe('console-screen-support', () => {
  it('gates Discover and ClawHub through backend capabilities', () => {
    const openClawCaps: GatewayBackendCapabilities = {
      chatAbort: true,
      chatAttachments: true,
      consoleDiscover: true,
      consoleClawHub: true,
      modelCatalog: true,
      modelSelection: true,
      configRead: true,
      configWrite: true,
      consoleFiles: true,
      consoleCron: true,
      consoleCronCreate: true,
      consoleSkills: true,
      consoleCost: true,
      consoleLogs: true,
      consoleUsage: true,
      consoleChannels: true,
      consoleNodes: true,
      consoleTools: true,
      consoleAgentList: true,
      consoleAgentDetail: true,
      consoleAgentSessionsBoard: true,
      consoleHeartbeat: true,
      consoleTasks: true,
      consoleCreateTask: true,
      consoleBoardMeetings: true,
      consoleCreateBoardMeeting: true,
      consoleNotifications: true,
      consoleAdmin: true,
      consoleAdminUsers: true,
      consoleAdminWorkspaces: true,
      consoleAdminBilling: true,
      consoleAdminAudit: true,
      consoleAdminSessions: true,
      consoleSkillsView: true,
      consoleAdminLogs: true,
      consoleAdminScheduledTasks: true,
      consoleAdminContainerTelemetry: true,
      pushNotifications: true,
      realtimeForeground: true,
      officeGameDelegate: true,
      openClawConfigScreens: true,
    };

    const hermesCaps: GatewayBackendCapabilities = {
      ...openClawCaps,
      consoleDiscover: false,
      consoleClawHub: false,
    };

    expect(isConsoleScreenSupported('Discover', openClawCaps)).toBe(true);
    expect(isConsoleScreenSupported('ClawHub', openClawCaps)).toBe(true);
    expect(isConsoleScreenSupported('Discover', hermesCaps)).toBe(false);
    expect(isConsoleScreenSupported('ClawHub', hermesCaps)).toBe(false);
    expect(isConsoleScreenSupported('AgentSessionsBoard', openClawCaps)).toBe(true);
    expect(isConsoleScreenSupported('AgentSessionsBoard', {
      ...hermesCaps,
      consoleAgentSessionsBoard: false,
    })).toBe(false);
  });

  it('gates Phase 6 screens through their capability flags', () => {
    const baseCaps: GatewayBackendCapabilities = {
      chatAbort: true,
      chatAttachments: true,
      consoleDiscover: true,
      consoleClawHub: true,
      modelCatalog: true,
      modelSelection: true,
      configRead: true,
      configWrite: true,
      consoleFiles: true,
      consoleCron: true,
      consoleCronCreate: true,
      consoleSkills: true,
      consoleCost: true,
      consoleLogs: true,
      consoleUsage: true,
      consoleChannels: true,
      consoleNodes: true,
      consoleTools: true,
      consoleAgentList: true,
      consoleAgentDetail: true,
      consoleAgentSessionsBoard: true,
      consoleHeartbeat: true,
      consoleTasks: true,
      consoleCreateTask: true,
      consoleBoardMeetings: true,
      consoleCreateBoardMeeting: true,
      consoleNotifications: true,
      consoleAdmin: true,
      consoleAdminUsers: true,
      consoleAdminWorkspaces: true,
      consoleAdminBilling: true,
      consoleAdminAudit: true,
      consoleAdminSessions: true,
      consoleSkillsView: true,
      consoleAdminLogs: true,
      consoleAdminScheduledTasks: true,
      consoleAdminContainerTelemetry: true,
      pushNotifications: true,
      realtimeForeground: true,
      officeGameDelegate: true,
      openClawConfigScreens: true,
    };

    // When flags are true, screens are supported.
    expect(isConsoleScreenSupported('BoardMeetings', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('BoardMeetingDetail', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('CreateBoardMeeting', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('Notifications', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('SkillList', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('SkillDetail', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('SkillContent', baseCaps)).toBe(true);

    // Flipping off each gate disables only the matching screens.
    expect(
      isConsoleScreenSupported('BoardMeetings', { ...baseCaps, consoleBoardMeetings: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('BoardMeetingDetail', { ...baseCaps, consoleBoardMeetings: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('CreateBoardMeeting', {
        ...baseCaps,
        consoleCreateBoardMeeting: false,
      }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('Notifications', { ...baseCaps, consoleNotifications: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('SkillList', { ...baseCaps, consoleSkills: false }),
    ).toBe(false);
  });

  it('gates Phase 7 admin screens through their capability flags', () => {
    const baseCaps: GatewayBackendCapabilities = {
      chatAbort: true,
      chatAttachments: true,
      consoleDiscover: true,
      consoleClawHub: true,
      modelCatalog: true,
      modelSelection: true,
      configRead: true,
      configWrite: true,
      consoleFiles: true,
      consoleCron: true,
      consoleCronCreate: true,
      consoleSkills: true,
      consoleCost: true,
      consoleLogs: true,
      consoleUsage: true,
      consoleChannels: true,
      consoleNodes: true,
      consoleTools: true,
      consoleAgentList: true,
      consoleAgentDetail: true,
      consoleAgentSessionsBoard: true,
      consoleHeartbeat: true,
      consoleTasks: true,
      consoleCreateTask: true,
      consoleBoardMeetings: true,
      consoleCreateBoardMeeting: true,
      consoleNotifications: true,
      consoleAdmin: true,
      consoleAdminUsers: true,
      consoleAdminWorkspaces: true,
      consoleAdminBilling: true,
      consoleAdminAudit: true,
      consoleAdminSessions: true,
      consoleSkillsView: true,
      consoleAdminLogs: true,
      consoleAdminScheduledTasks: true,
      consoleAdminContainerTelemetry: true,
      pushNotifications: true,
      realtimeForeground: true,
      officeGameDelegate: true,
      openClawConfigScreens: true,
    };

    // All admin screens visible when flags are true.
    expect(isConsoleScreenSupported('AdminMenu', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminUsers', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminWorkspaces', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminBilling', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminAudit', baseCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminSessions', baseCaps)).toBe(true);

    // Flipping off each gate disables only the matching screen.
    expect(
      isConsoleScreenSupported('AdminMenu', { ...baseCaps, consoleAdmin: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('AdminUsers', { ...baseCaps, consoleAdminUsers: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('AdminWorkspaces', { ...baseCaps, consoleAdminWorkspaces: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('AdminBilling', { ...baseCaps, consoleAdminBilling: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('AdminAudit', { ...baseCaps, consoleAdminAudit: false }),
    ).toBe(false);
    expect(
      isConsoleScreenSupported('AdminSessions', { ...baseCaps, consoleAdminSessions: false }),
    ).toBe(false);
  });
});
