import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Volume2,
  BatteryCharging,
  ChevronUp,
  Power,
  RotateCcw,
  ExternalLink,
  LogOut,
  Plus,
} from 'lucide-react';
import {
  GlassPaneState,
  getOpenApplicationWindows,
  getLaunchableUserApplications,
} from '../utils/windowManager';
import { AppWindowIcon, GlassPaneIcon, Win11StartIcon } from './AppIcons';

interface Win11TaskbarAndTrayProps {
  state: GlassPaneState;
  onClickTrayGlassPaneIcon: () => void;
  onToggleGlobalOpacity: () => void;
  onResetAllOpacities: () => void;
  onExitApplication: () => void;
  onRelaunchApplication: () => void;
  onFocusOrRestoreAppWindow: (id: string) => void;
  onOpenAppWindow: (id: string) => void;
  onCloseAppWindow: (id: string) => void;
  onSpawnCustomApp: (name: string) => void;
}

export function Win11TaskbarAndTray({
  state,
  onClickTrayGlassPaneIcon,
  onToggleGlobalOpacity,
  onResetAllOpacities,
  onExitApplication,
  onRelaunchApplication,
  onFocusOrRestoreAppWindow,
  onOpenAppWindow,
  onCloseAppWindow,
  onSpawnCustomApp,
}: Win11TaskbarAndTrayProps) {
  const [isTrayContextMenuOpen, setIsTrayContextMenuOpen] = useState(false);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [customAppName, setCustomAppName] = useState('');

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const startMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isTrayContextMenuOpen &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsTrayContextMenuOpen(false);
      }
      if (
        isStartMenuOpen &&
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target as Node)
      ) {
        setIsStartMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isTrayContextMenuOpen, isStartMenuOpen]);

  const openWindows = getOpenApplicationWindows(state.processes);
  const allUserApps = getLaunchableUserApplications(state.processes);
  const isLight = state.win11Theme === 'light';

  const handleTrayRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.isAppRunning) return;
    setIsTrayContextMenuOpen((prev) => !prev);
  };

  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName.trim()) return;
    onSpawnCustomApp(customAppName.trim());
    setCustomAppName('');
    setIsStartMenuOpen(false);
  };

  return (
    <footer
      aria-label="Windows 11 Taskbar and System Tray"
      className={`fixed bottom-0 inset-x-0 h-12 z-[80] border-t backdrop-blur-2xl px-3 flex items-center justify-between select-none transition-colors ${
        isLight
          ? 'bg-slate-100/90 border-slate-300/90 text-slate-900'
          : 'bg-slate-950/90 border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Requirement 1: Left spacer is completely untouched (no GlassPane text or edits on the taskbar) */}
      <div className="hidden sm:block min-w-[140px]" />

      {/* Center Zone: Standard Untouched Windows 11 Taskbar Icons (Start + Open Apps) */}
      <div className="relative flex items-center gap-1" ref={startMenuRef}>
        <button
          type="button"
          onClick={() => setIsStartMenuOpen((prev) => !prev)}
          aria-label="Windows 11 Start Button"
          aria-expanded={isStartMenuOpen}
          data-testid="win11-start-button"
          title="Start (Open or Close Running Applications)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isStartMenuOpen
              ? isLight
                ? 'bg-slate-200'
                : 'bg-slate-800'
              : isLight
              ? 'hover:bg-slate-200/80'
              : 'hover:bg-slate-800/80'
          }`}
        >
          <Win11StartIcon className="w-5 h-5" />
        </button>

        {/* Windows 11 Start Menu Launcher */}
        {isStartMenuOpen && (
          <div
            role="dialog"
            aria-label="Windows 11 Start Menu Application Launcher"
            data-testid="win11-start-menu"
            className={`absolute left-0 bottom-13 z-[110] w-84 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-900'
                : 'bg-[#1c1e24]/95 border-slate-700/80 text-slate-100'
            }`}
          >
            {/* Standalone GlassPane.exe Launcher */}
            <div className="mb-3 pb-3 border-b border-slate-800/80 space-y-1.5">
              <div className="text-[11px] font-semibold text-sky-400 flex items-center justify-between">
                <span>Standalone Utility</span>
              </div>
              <div
                data-testid="start-menu-glasspane-exe-item"
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs ${
                  isLight
                    ? 'border-sky-300 bg-sky-50/80'
                    : 'border-sky-500/30 bg-sky-950/25'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GlassPaneIcon className="w-5 h-5 shrink-0" active={true} />
                  <div className="min-w-0">
                    <div className="font-semibold font-mono truncate">
                      GlassPane.exe
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[165px]">
                      Window Opacity Utility
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="start-menu-run-glasspane-exe"
                  onClick={() => {
                    onRelaunchApplication();
                    setIsStartMenuOpen(false);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#3898ff] hover:bg-sky-400 text-slate-950 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {state.isAppRunning && state.isUtilityWindowOpen ? 'Running' : 'Launch'}
                </button>
              </div>
            </div>

            <div className="text-xs font-semibold mb-2.5 flex items-center justify-between">
              <span>Applications (Dynamic Open / Close)</span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {openWindows.length} running
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 win11-scroll-area">
              {allUserApps.map((app) => {
                const isRunning = app.hasOpenWindow && !app.isClosed;
                return (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                      isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AppWindowIcon
                        appId={app.id}
                        category={app.category}
                        className="w-5 h-5 shrink-0"
                        grayscale={!isRunning}
                      />
                      <div className="truncate">
                        <div className="font-medium truncate">{app.appName}</div>
                        <div className="text-[10px] text-slate-400">
                          {app.hasIdentifiedColorTheme ? 'Brand Color Theme' : 'Gold Gradient Default'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`start-toggle-${app.id}`}
                      onClick={() => {
                        if (isRunning) {
                          onCloseAppWindow(app.id);
                        } else {
                          onOpenAppWindow(app.id);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        isRunning
                          ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                          : 'bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400'
                      }`}
                    >
                      {isRunning ? 'Close' : 'Open'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Spawn a Custom Application (Unidentified Color Theme -> Gold Gradient) */}
            <form onSubmit={handleCreateCustomApp} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5">
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="Open custom app (Gold theme)..."
                aria-label="Custom application name"
                className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
              <button
                type="submit"
                aria-label="Launch custom application"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open</span>
              </button>
            </form>
          </div>
        )}

        <div
          className={`h-5 w-px mx-1 ${
            isLight ? 'bg-slate-300' : 'bg-slate-800'
          }`}
        />

        {/* Requirement 1: Standard Windows 11 Taskbar App Icons (No opacity badges or GlassPane edits) */}
        {openWindows.map((win) => {
          const isSelected = state.selectedWindowId === win.id && !win.isMinimized;
          return (
            <button
              key={win.id}
              type="button"
              onClick={() => onFocusOrRestoreAppWindow(win.id)}
              aria-label={win.appName}
              title={win.appName}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? isLight
                    ? 'bg-slate-200/90 shadow-xs'
                    : 'bg-slate-800/90 shadow-xs'
                  : isLight
                  ? 'hover:bg-slate-200/60'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <AppWindowIcon
                appId={win.id}
                category={win.category}
                className="w-5 h-5 shrink-0"
                grayscale={false}
              />
              <span
                className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                  isSelected ? 'w-4 bg-sky-400' : 'w-1.5 bg-slate-500'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Right Zone: Standard Windows 11 System Tray with ONLY the Glass Pane Tray Icon */}
      <div className="flex items-center gap-1" ref={menuContainerRef}>
        <ChevronUp
          className={`w-3.5 h-3.5 mr-0.5 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
          aria-hidden="true"
        />

        {/* Requirement 1: Only the Glass Pane tray icon indicates GlassPane is running */}
        {state.isAppRunning ? (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={onClickTrayGlassPaneIcon}
              onContextMenu={handleTrayRightClick}
              aria-label="GlassPane system tray icon"
              data-testid="system-tray-glasspane-icon"
              title="GlassPane (Click to open/hide · Right-click to Exit)"
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                state.isUtilityWindowOpen
                  ? isLight
                    ? 'bg-slate-200/90'
                    : 'bg-white/10'
                  : isLight
                  ? 'hover:bg-slate-200/70'
                  : 'hover:bg-white/10'
              }`}
            >
              <GlassPaneIcon
                className="w-4 h-4 shrink-0"
                active={state.globalOpacityEnabled}
              />
            </button>

            {/* Windows 11 System Tray Right-Click Context Menu */}
            {isTrayContextMenuOpen && (
              <div
                role="menu"
                aria-label="GlassPane System Tray Context Menu"
                data-testid="system-tray-context-menu"
                className={`absolute right-0 bottom-11 z-[100] w-56 rounded-xl border p-1.5 shadow-2xl backdrop-blur-2xl ${
                  isLight
                    ? 'bg-white/95 border-slate-300 text-slate-900'
                    : 'bg-slate-900/95 border-slate-700 text-slate-100'
                }`}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClickTrayGlassPaneIcon();
                    setIsTrayContextMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{state.isUtilityWindowOpen ? 'Hide GlassPane' : 'Open GlassPane'}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleGlobalOpacity();
                    setIsTrayContextMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                  }`}
                >
                  <Power className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    {state.globalOpacityEnabled
                      ? 'Turn Off All Opacity'
                      : 'Turn On All Opacity'}
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onResetAllOpacities();
                    setIsTrayContextMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Reset All to 100%</span>
                </button>

                <div
                  className={`my-1 h-px ${
                    isLight ? 'bg-slate-200' : 'bg-slate-800'
                  }`}
                />

                <button
                  type="button"
                  role="menuitem"
                  data-testid="tray-menu-exit"
                  onClick={() => {
                    setIsTrayContextMenuOpen(false);
                    onExitApplication();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 text-left text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Exit</span>
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Standard Windows 11 System Tray Status Icons */}
        <div
          className={`hidden md:flex items-center gap-2 px-2 py-1.5 rounded-lg ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <BatteryCharging className="w-3.5 h-3.5" />
        </div>

        {/* Windows 11 Clock */}
        <div
          className={`text-right pl-1 pr-1.5 text-[11px] leading-tight font-mono tabular-nums ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}
        >
          <div>10:09 AM</div>
          <div className="text-[10px] opacity-75">11/13/2026</div>
        </div>
      </div>
    </footer>
  );
}
