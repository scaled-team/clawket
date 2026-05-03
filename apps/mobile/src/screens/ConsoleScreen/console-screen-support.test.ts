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

  it('Phase 1b: all Delegate-only surfaces are supported under DELEGATE_CAPABILITIES', () => {
    // Mirrors the DELEGATE_CAPABILITIES object from gateway-backends.ts so the
    // test is self-contained and does not import the live constant (which would
    // make it a snapshot of the file rather than an explicit contract check).
    const delegateCaps: GatewayBackendCapabilities = {
      chatAbort: false,
      chatAttachments: false,
      consoleDiscover: false,
      consoleClawHub: false,
      modelCatalog: false,
      modelSelection: false,
      configRead: false,
      configWrite: false,
      consoleChannels: true,
      consoleCron: true,
      consoleCronCreate: false,
      consoleSkills: true,
      consoleUsage: true,
      consoleCost: true,
      consoleTools: true,
      consoleNodes: false,
      consoleFiles: false,
      consoleLogs: false,
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
      openClawConfigScreens: false,
    };

    // Tasks surface.
    expect(isConsoleScreenSupported('TaskList', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('TaskDetail', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('CreateTask', delegateCaps)).toBe(true);

    // Cron surface (view-only; create disabled because consoleCronCreate=false).
    expect(isConsoleScreenSupported('CronList', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('CronDetail', delegateCaps)).toBe(true);

    // Notifications surface.
    expect(isConsoleScreenSupported('Notifications', delegateCaps)).toBe(true);

    // Agents surface.
    expect(isConsoleScreenSupported('AgentList', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AgentDetail', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('CreateAgent', delegateCaps)).toBe(true);

    // Board meetings surface.
    expect(isConsoleScreenSupported('BoardMeetings', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('BoardMeetingDetail', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('CreateBoardMeeting', delegateCaps)).toBe(true);

    // Admin surface.
    expect(isConsoleScreenSupported('AdminMenu', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminUsers', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminWorkspaces', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminBilling', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminAudit', delegateCaps)).toBe(true);
    expect(isConsoleScreenSupported('AdminSessions', delegateCaps)).toBe(true);

    // Surfaces that are intentionally off for Delegate.
    expect(isConsoleScreenSupported('Discover', delegateCaps)).toBe(false);
    expect(isConsoleScreenSupported('ClawHub', delegateCaps)).toBe(false);
    expect(isConsoleScreenSupported('ModelList', delegateCaps)).toBe(false);
    expect(isConsoleScreenSupported('Nodes', delegateCaps)).toBe(false);
    expect(isConsoleScreenSupported('FileList', delegateCaps)).toBe(false);
    expect(isConsoleScreenSupported('Logs', delegateCaps)).toBe(false);
  });
});
