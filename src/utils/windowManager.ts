export type AppCategory = 'communication' | 'browser' | 'media' | 'system' | 'gaming' | 'utility';

export interface BrandColorScheme {
  /** Card background gradient when toggled ON */
  cardBg: string;
  /** Card border color when toggled ON */
  cardBorder: string;
  /** Active filled slider track color when toggled ON */
  sliderTrack: string;
  /** Unfilled right-hand slider track & tick mark color when toggled ON */
  sliderUnfilled: string;
  /** Slider thumb inner fill color when toggled ON */
  thumbFill: string;
  /** Slider thumb outer ring color when toggled ON */
  thumbRing: string;
  /** Light-mode card background when toggled ON */
  lightCardBg: string;
  /** Light-mode card border when toggled ON */
  lightCardBorder: string;
}

/**
 * Requirement 6: Default standard color of Gold Gradient for any application
 * where a specific brand color theme cannot be identified.
 */
export const DEFAULT_GOLD_BRAND_COLORS: BrandColorScheme = {
  cardBg: 'linear-gradient(135deg, rgba(118, 83, 14, 0.90) 0%, rgba(78, 53, 9, 0.95) 100%)',
  cardBorder: '#eab308',
  sliderTrack: '#facc15',
  sliderUnfilled: 'rgba(250, 204, 21, 0.32)',
  thumbFill: '#fde047',
  thumbRing: 'rgba(234, 179, 8, 0.45)',
  lightCardBg: 'linear-gradient(135deg, rgba(254, 249, 195, 0.96) 0%, rgba(253, 224, 71, 0.92) 100%)',
  lightCardBorder: '#ca8a04',
};

export interface ProcessEntry {
  id: string;
  hwnd: string;
  pid: number;
  processName: string;
  appName: string;
  windowTitle: string;
  category: AppCategory;
  /** True if the process has a top-level visible window (IsWindowVisible && !DWMWA_CLOAKED) */
  hasOpenWindow: boolean;
  /** True if it's a background daemon/service without a user window */
  isBackgroundProcess: boolean;
  /** True if the user closed/quit the application window */
  isClosed: boolean;
  /** True if minimized to taskbar */
  isMinimized: boolean;
  /** Configured opacity percentage (10 - 100) */
  opacityPercent: number;
  /**
   * Requirement 2: Independent per-application ON / OFF toggle.
   * When true (ON), the application bar adopts its brand color (or gold gradient) and applies opacity.
   * When false (OFF), the application bar renders in grayscale and the window is 100% solid.
   */
  isTransparencyActive: boolean;
  /**
   * Requirement 6: Whether a known application color theme was identified.
   * If false, GlassPane automatically uses DEFAULT_GOLD_BRAND_COLORS.
   */
  hasIdentifiedColorTheme: boolean;
  /** Optional identified brand color scheme */
  brandColors?: BrandColorScheme;
  /** Window position and dimensions on the simulated Windows 11 desktop */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
}

export interface GlassPaneState {
  /** Whether GlassPane.exe is currently running in the system tray */
  isAppRunning: boolean;
  /** Whether the GlassPane Windows 11 window is open on screen */
  isUtilityWindowOpen: boolean;
  /** Master ON/OFF switch at the top of the application for all applications */
  globalOpacityEnabled: boolean;
  /** Currently focused desktop window ID */
  selectedWindowId: string | null;
  /** Windows 11 theme mode for the utility */
  win11Theme: 'dark' | 'light';
  /** All desktop & background processes */
  processes: ProcessEntry[];
}

export const MIN_OPACITY_PERCENT = 10;
export const MAX_OPACITY_PERCENT = 100;

/**
 * Returns the identified brand color scheme for a process, or the default Gold Gradient
 * when a color theme cannot be identified (Requirement 6).
 */
export function resolveProcessColorScheme(proc: Pick<ProcessEntry, 'hasIdentifiedColorTheme' | 'brandColors'>): BrandColorScheme {
  if (proc.hasIdentifiedColorTheme && proc.brandColors) {
    return proc.brandColors;
  }
  return DEFAULT_GOLD_BRAND_COLORS;
}

/**
 * Clamps opacity percentage to safe visible bounds [10%, 100%].
 */
export function clampOpacity(percent: number): number {
  if (Number.isNaN(percent)) return MAX_OPACITY_PERCENT;
  return Math.min(MAX_OPACITY_PERCENT, Math.max(MIN_OPACITY_PERCENT, Math.round(percent)));
}

/**
 * Converts a percentage (10..100) to a Win32 LWA_ALPHA byte (26..255).
 */
export function percentToAlphaByte(percent: number): number {
  const clamped = clampOpacity(percent);
  return Math.round((clamped / 100) * 255);
}

/**
 * Converts a Win32 LWA_ALPHA byte (0..255) back to a percentage (10..100).
 */
export function alphaByteToPercent(alphaByte: number): number {
  const safeByte = Math.min(255, Math.max(0, Math.round(alphaByte)));
  return clampOpacity((safeByte / 255) * 100);
}

/**
 * Computes the effective visual opacity (10..100) rendered by Windows DWM for a window.
 * Rules:
 * 1. If GlassPane.exe is exited (!state.isAppRunning), all windows revert to 100% opaque.
 * 2. If the master top toggle (state.globalOpacityEnabled) is OFF, all windows revert to 100% opaque.
 * 3. If the individual application bar is toggled OFF (!proc.isTransparencyActive), it renders at 100% opaque.
 * 4. Otherwise, it renders at its configured opacityPercent.
 */
export function computeEffectiveOpacity(
  proc: Pick<ProcessEntry, 'opacityPercent' | 'isTransparencyActive'>,
  state: Pick<GlassPaneState, 'isAppRunning' | 'globalOpacityEnabled'>
): number {
  if (!state.isAppRunning || !state.globalOpacityEnabled) {
    return 100;
  }
  if (!proc.isTransparencyActive) {
    return 100;
  }
  return clampOpacity(proc.opacityPercent);
}

/**
 * Requirement 3 & 4: Filters all processes down to ONLY applications that are currently
 * running with an open window (!isClosed && hasOpenWindow && !isBackgroundProcess).
 * If Firefox (or any app) is closed, it does not show up in GlassPane; when opened, it populates dynamically.
 */
export function getOpenApplicationWindows(
  processes: ProcessEntry[],
  searchQuery = ''
): ProcessEntry[] {
  const q = searchQuery.trim().toLowerCase();
  return processes.filter((p) => {
    const isVisibleUserWindow = p.hasOpenWindow && !p.isBackgroundProcess && !p.isClosed;
    if (!isVisibleUserWindow) return false;
    if (!q) return true;
    return (
      p.appName.toLowerCase().includes(q) ||
      p.windowTitle.toLowerCase().includes(q) ||
      p.processName.toLowerCase().includes(q)
    );
  });
}

/**
 * Returns all user applications (both currently open and currently closed) so they can be
 * dynamically launched or quit from the Windows 11 Desktop Shortcuts or Start Menu.
 */
export function getLaunchableUserApplications(processes: ProcessEntry[]): ProcessEntry[] {
  return processes.filter((p) => !p.isBackgroundProcess);
}

/**
 * Returns all background processes that were ignored by the window enumerator.
 */
export function getIgnoredBackgroundProcesses(processes: ProcessEntry[]): ProcessEntry[] {
  return processes.filter((p) => p.isBackgroundProcess);
}

/**
 * Updates the opacity percentage of a target window and turns that application's
 * independent toggle ON (so its bar illuminates in its brand color / gold gradient).
 */
export function updateWindowOpacity(
  state: GlassPaneState,
  windowId: string,
  newPercent: number
): GlassPaneState {
  const clamped = clampOpacity(newPercent);
  return {
    ...state,
    selectedWindowId: windowId,
    globalOpacityEnabled: true,
    processes: state.processes.map((proc) =>
      proc.id === windowId
        ? {
            ...proc,
            opacityPercent: clamped,
            isTransparencyActive: true,
          }
        : proc
    ),
  };
}

/**
 * Requirement 2: Toggles an individual application bar ON (colored) or OFF (grayscale)
 * independently of all other application bars.
 */
export function toggleSingleWindowOpacity(
  state: GlassPaneState,
  windowId: string
): GlassPaneState {
  return {
    ...state,
    selectedWindowId: windowId,
    processes: state.processes.map((proc) => {
      if (proc.id !== windowId) return proc;
      const nextActive = !proc.isTransparencyActive;
      return {
        ...proc,
        isTransparencyActive: nextActive,
      };
    }),
  };
}

/**
 * Toggles the master ON/OFF switch at the top of the application for ALL open applications.
 */
export function toggleGlobalMasterOpacity(
  state: GlassPaneState,
  explicitValue?: boolean
): GlassPaneState {
  const nextGlobal = explicitValue !== undefined ? explicitValue : !state.globalOpacityEnabled;
  return {
    ...state,
    globalOpacityEnabled: nextGlobal,
  };
}

/**
 * Requirement 3 & 4: Opens/launches an application so its window appears on the desktop
 * and dynamically populates inside the GlassPane application list.
 */
export function openApplicationWindow(
  state: GlassPaneState,
  windowId: string
): GlassPaneState {
  const maxZ = state.processes.reduce((acc, p) => Math.max(acc, p.zIndex), 10);
  return {
    ...state,
    selectedWindowId: windowId,
    processes: state.processes.map((proc) =>
      proc.id === windowId
        ? {
            ...proc,
            hasOpenWindow: true,
            isClosed: false,
            isMinimized: false,
            zIndex: maxZ + 1,
          }
        : proc
    ),
  };
}

/**
 * Requirement 3 & 4: Closes/quits a running application window so it is immediately
 * removed from the GlassPane application list.
 */
export function closeApplicationWindow(
  state: GlassPaneState,
  windowId: string
): GlassPaneState {
  const nextProcesses = state.processes.map((p) =>
    p.id === windowId ? { ...p, isClosed: true, hasOpenWindow: false } : p
  );
  const remainingOpen = getOpenApplicationWindows(nextProcesses);
  return {
    ...state,
    selectedWindowId:
      state.selectedWindowId === windowId
        ? remainingOpen.length > 0
          ? remainingOpen[0].id
          : null
        : state.selectedWindowId,
    processes: nextProcesses,
  };
}

/**
 * Spawns a new custom third-party application window without a predefined color theme,
 * automatically receiving the default Gold Gradient color scheme (Requirement 6).
 */
export function spawnCustomApplicationWindow(
  state: GlassPaneState,
  appName: string
): GlassPaneState {
  const cleanName = appName.trim() || 'Custom Utility';
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `win-custom-${slug}-${state.processes.length + 1}`;
  const maxZ = state.processes.reduce((acc, p) => Math.max(acc, p.zIndex), 10);
  const offset = (state.processes.length % 5) * 28;

  const newEntry: ProcessEntry = {
    id,
    hwnd: `0x000F${(1000 + state.processes.length).toString(16).toUpperCase()}`,
    pid: 24000 + state.processes.length * 112,
    processName: `${slug}.exe`,
    appName: cleanName,
    windowTitle: `${cleanName} — Active Window`,
    category: 'utility',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 75,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: false, // Uses DEFAULT_GOLD_BRAND_COLORS
    rect: { x: 140 + offset, y: 90 + offset, width: 450, height: 300 },
    zIndex: maxZ + 1,
  };

  return {
    ...state,
    selectedWindowId: id,
    processes: [...state.processes, newEntry],
  };
}

/**
 * Resets all windows back to 100% solid opacity and turns their individual toggles OFF (grayscale).
 */
export function resetAllWindowOpacities(state: GlassPaneState): GlassPaneState {
  return {
    ...state,
    processes: state.processes.map((proc) => ({
      ...proc,
      opacityPercent: 100,
      isTransparencyActive: false,
    })),
  };
}

/**
 * Closes GlassPane via right-clicking the system tray icon and choosing Exit.
 */
export function exitGlassPaneApp(state: GlassPaneState): GlassPaneState {
  return {
    ...state,
    isAppRunning: false,
    isUtilityWindowOpen: false,
    selectedWindowId: null,
  };
}

/**
 * Relaunches GlassPane.exe into the Windows 11 system tray.
 */
export function relaunchGlassPaneApp(state: GlassPaneState): GlassPaneState {
  const openWins = getOpenApplicationWindows(state.processes);
  return {
    ...state,
    isAppRunning: true,
    isUtilityWindowOpen: true,
    selectedWindowId: openWins.length > 0 ? openWins[0].id : null,
  };
}

export const INITIAL_PROCESSES: ProcessEntry[] = [
  {
    id: 'win-discord',
    hwnd: '0x000912F4',
    pid: 19304,
    processName: 'Discord.exe',
    appName: 'Discord',
    windowTitle: '#win32-engineering · Discord',
    category: 'communication',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 50,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(46, 50, 92, 0.88) 0%, rgba(38, 41, 74, 0.92) 100%)',
      cardBorder: '#5865F2',
      sliderTrack: '#6d78f7',
      sliderUnfilled: 'rgba(129, 140, 248, 0.32)',
      thumbFill: '#7c86f9',
      thumbRing: 'rgba(88, 101, 242, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(224, 231, 255, 0.95) 0%, rgba(199, 210, 254, 0.95) 100%)',
      lightCardBorder: '#4f46e5',
    },
    rect: { x: 88, y: 24, width: 350, height: 265 },
    zIndex: 14,
  },
  {
    id: 'win-firefox',
    hwnd: '0x0004082A',
    pid: 14820,
    processName: 'firefox.exe',
    appName: 'Firefox',
    windowTitle: 'Layered Windows API — Mozilla Firefox',
    category: 'browser',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 75,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(84, 53, 20, 0.90) 0%, rgba(64, 40, 15, 0.94) 100%)',
      cardBorder: '#d97706',
      sliderTrack: '#f59e0b',
      sliderUnfilled: 'rgba(245, 158, 11, 0.32)',
      thumbFill: '#fbbf24',
      thumbRing: 'rgba(217, 119, 6, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.95) 100%)',
      lightCardBorder: '#d97706',
    },
    rect: { x: 88, y: 305, width: 350, height: 265 },
    zIndex: 13,
  },
  {
    id: 'win-spotify',
    hwnd: '0x00070B18',
    pid: 11208,
    processName: 'Spotify.exe',
    appName: 'Spotify',
    windowTitle: 'Tycho — Dive · Spotify',
    category: 'media',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 100,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(26, 68, 45, 0.90) 0%, rgba(20, 53, 35, 0.94) 100%)',
      cardBorder: '#1db954',
      sliderTrack: '#22c55e',
      sliderUnfilled: 'rgba(34, 197, 94, 0.32)',
      thumbFill: '#22c55e',
      thumbRing: 'rgba(29, 185, 84, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(220, 252, 231, 0.95) 0%, rgba(187, 247, 208, 0.95) 100%)',
      lightCardBorder: '#16a34a',
    },
    rect: { x: 1002, y: 24, width: 418, height: 265 },
    zIndex: 12,
  },
  {
    id: 'win-chrome',
    hwnd: '0x000C34E0',
    pid: 22410,
    processName: 'chrome.exe',
    appName: 'Google Chrome',
    windowTitle: 'Desktop Composition — Google Chrome',
    category: 'browser',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 50,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(30, 52, 78, 0.90) 0%, rgba(23, 40, 62, 0.94) 100%)',
      cardBorder: '#3b82f6',
      sliderTrack: '#3b82f6',
      sliderUnfilled: 'rgba(59, 130, 246, 0.32)',
      thumbFill: '#60a5fa',
      thumbRing: 'rgba(59, 130, 246, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.95) 100%)',
      lightCardBorder: '#2563eb',
    },
    rect: { x: 1002, y: 305, width: 418, height: 265 },
    zIndex: 11,
  },
  {
    id: 'win-settings',
    hwnd: '0x0002019C',
    pid: 6840,
    processName: 'SystemSettings.exe',
    appName: 'System Settings',
    windowTitle: 'Personalization · Windows 11 Settings',
    category: 'system',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 25,
    isTransparencyActive: false, // Starts OFF (grayscale) to demonstrate independent per-bar ON/OFF state
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(42, 54, 68, 0.90) 0%, rgba(33, 42, 54, 0.94) 100%)',
      cardBorder: '#38bdf8',
      sliderTrack: '#38bdf8',
      sliderUnfilled: 'rgba(56, 189, 248, 0.32)',
      thumbFill: '#7dd3fc',
      thumbRing: 'rgba(56, 189, 248, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(224, 242, 254, 0.95) 0%, rgba(186, 230, 253, 0.95) 100%)',
      lightCardBorder: '#0284c7',
    },
    rect: { x: 88, y: 584, width: 350, height: 245 },
    zIndex: 9,
  },
  {
    id: 'win-steam',
    hwnd: '0x000E51A2',
    pid: 16490,
    processName: 'steam.exe',
    appName: 'Steam',
    windowTitle: 'Library · Steam Client',
    category: 'gaming',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 75,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: true,
    brandColors: {
      cardBg: 'linear-gradient(135deg, rgba(27, 45, 72, 0.92) 0%, rgba(21, 35, 56, 0.95) 100%)',
      cardBorder: '#3b6e9c',
      sliderTrack: '#3876a8',
      sliderUnfilled: 'rgba(56, 118, 168, 0.35)',
      thumbFill: '#5294c9',
      thumbRing: 'rgba(59, 110, 156, 0.45)',
      lightCardBg: 'linear-gradient(135deg, rgba(226, 232, 240, 0.95) 0%, rgba(203, 213, 225, 0.95) 100%)',
      lightCardBorder: '#334155',
    },
    rect: { x: 1002, y: 584, width: 418, height: 245 },
    zIndex: 8,
  },
  {
    id: 'win-notepad',
    hwnd: '0x000A4410',
    pid: 21040,
    processName: 'notepad.exe',
    appName: 'Notepad',
    windowTitle: 'release-notes.txt — Notepad',
    category: 'utility',
    hasOpenWindow: true,
    isBackgroundProcess: false,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 75,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: false, // Unidentified theme -> automatically uses Gold Gradient
    rect: { x: 455, y: 635, width: 530, height: 200 },
    zIndex: 7,
  },
  {
    id: 'win-terminal',
    hwnd: '0x000B8820',
    pid: 23190,
    processName: 'WindowsTerminal.exe',
    appName: 'Windows Terminal',
    windowTitle: 'PowerShell 7.4 — Windows Terminal',
    category: 'utility',
    hasOpenWindow: false, // Starts closed on desktop so user can launch it dynamically
    isBackgroundProcess: false,
    isClosed: true,
    isMinimized: false,
    opacityPercent: 50,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: false, // Unidentified theme -> uses Gold Gradient when opened
    rect: { x: 160, y: 110, width: 480, height: 310 },
    zIndex: 6,
  },
  {
    id: 'win-calculator',
    hwnd: '0x000D1904',
    pid: 25810,
    processName: 'CalculatorApp.exe',
    appName: 'Calculator',
    windowTitle: 'Calculator · Programmer Mode',
    category: 'utility',
    hasOpenWindow: false, // Starts closed on desktop so user can launch it dynamically
    isBackgroundProcess: false,
    isClosed: true,
    isMinimized: false,
    opacityPercent: 75,
    isTransparencyActive: true,
    hasIdentifiedColorTheme: false, // Unidentified theme -> uses Gold Gradient when opened
    rect: { x: 820, y: 120, width: 360, height: 320 },
    zIndex: 5,
  },
  // Ignored background processes (no visible top-level window)
  {
    id: 'bg-svchost-dcom',
    hwnd: '0x00000000',
    pid: 892,
    processName: 'svchost.exe',
    appName: 'Service Host: DCOM Server Process Launcher',
    windowTitle: '',
    category: 'system',
    hasOpenWindow: false,
    isBackgroundProcess: true,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 100,
    isTransparencyActive: false,
    hasIdentifiedColorTheme: false,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    zIndex: 0,
  },
  {
    id: 'bg-runtimebroker',
    hwnd: '0x00000000',
    pid: 4712,
    processName: 'RuntimeBroker.exe',
    appName: 'Windows Runtime Broker',
    windowTitle: '',
    category: 'system',
    hasOpenWindow: false,
    isBackgroundProcess: true,
    isClosed: false,
    isMinimized: false,
    opacityPercent: 100,
    isTransparencyActive: false,
    hasIdentifiedColorTheme: false,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    zIndex: 0,
  },
];

export function createInitialGlassPaneState(): GlassPaneState {
  return {
    isAppRunning: true,
    isUtilityWindowOpen: true,
    globalOpacityEnabled: true,
    selectedWindowId: 'win-discord',
    win11Theme: 'dark',
    processes: INITIAL_PROCESSES,
  };
}
