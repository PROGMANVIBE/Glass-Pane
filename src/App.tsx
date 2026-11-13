import React, { useState } from 'react';
import {
  createInitialGlassPaneState,
  updateWindowOpacity,
  toggleSingleWindowOpacity,
  toggleGlobalMasterOpacity,
  openApplicationWindow,
  closeApplicationWindow,
  spawnCustomApplicationWindow,
  resetAllWindowOpacities,
  exitGlassPaneApp,
  relaunchGlassPaneApp,
  getOpenApplicationWindows,
  getLaunchableUserApplications,
} from './utils/windowManager';
import { SimulatedDesktopWindow } from './components/SimulatedDesktopWindow';
import { GlassPaneUtilityWindow } from './components/GlassPaneUtilityWindow';
import { Win11TaskbarAndTray } from './components/Win11TaskbarAndTray';
import { AppWindowIcon, GlassPaneIcon } from './components/AppIcons';

const WALLPAPER_PATH = '/src/assets/images/win11_bloom_wallpaper_1794593534840.jpg';

export default function App() {
  const [state, setState] = useState(() => ({
    ...createInitialGlassPaneState(),
    isAppRunning: false,
    isUtilityWindowOpen: false,
  }));
  const [wallpaperFailed, setWallpaperFailed] = useState(false);
  const [selectedDesktopIcon, setSelectedDesktopIcon] = useState<string | null>('glasspane-exe');

  const handleFocusDesktopWindow = (id: string) => {
    setState((prev) => {
      const maxZ = prev.processes.reduce((acc, p) => Math.max(acc, p.zIndex), 10);
      return {
        ...prev,
        selectedWindowId: id,
        processes: prev.processes.map((p) =>
          p.id === id ? { ...p, isMinimized: false, zIndex: maxZ + 1 } : p
        ),
      };
    });
  };

  const handleToggleSingleWindow = (id: string) => {
    setState((prev) => toggleSingleWindowOpacity(prev, id));
  };

  const handleChangeWindowOpacity = (id: string, newPercent: number) => {
    setState((prev) => updateWindowOpacity(prev, id, newPercent));
  };

  const handleToggleGlobalOpacity = () => {
    setState((prev) => toggleGlobalMasterOpacity(prev));
  };

  const handleResetAllOpacities = () => {
    setState((prev) => resetAllWindowOpacities(prev));
  };

  const handleExitApp = () => {
    setState((prev) => exitGlassPaneApp(prev));
  };

  const handleRelaunchApp = () => {
    setState((prev) => relaunchGlassPaneApp(prev));
  };

  const handleClickTrayGlassPaneIcon = () => {
    setState((prev) => ({
      ...prev,
      isUtilityWindowOpen: !prev.isUtilityWindowOpen,
    }));
  };

  const handleMinimizeWindow = (id: string) => {
    setState((prev) => ({
      ...prev,
      selectedWindowId: prev.selectedWindowId === id ? null : prev.selectedWindowId,
      processes: prev.processes.map((p) =>
        p.id === id ? { ...p, isMinimized: true } : p
      ),
    }));
  };

  const handleCloseWindow = (id: string) => {
    setState((prev) => closeApplicationWindow(prev, id));
  };

  const handleOpenWindow = (id: string) => {
    setState((prev) => openApplicationWindow(prev, id));
  };

  const handleSpawnCustomApp = (appName: string) => {
    setState((prev) => spawnCustomApplicationWindow(prev, appName));
  };

  const handleMoveWindow = (id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      processes: prev.processes.map((p) =>
        p.id === id ? { ...p, rect: { ...p.rect, x, y } } : p
      ),
    }));
  };

  const handleRestoreClosedWindows = () => {
    setState((prev) => ({
      ...prev,
      selectedWindowId: 'win-discord',
      processes: prev.processes.map((p) =>
        !p.isBackgroundProcess
          ? { ...p, hasOpenWindow: true, isClosed: false, isMinimized: false }
          : p
      ),
    }));
  };

  const handleToggleTheme = () => {
    setState((prev) => {
      const nextTheme = prev.win11Theme === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...prev, win11Theme: nextTheme };
    });
  };

  const openWindows = getOpenApplicationWindows(state.processes);
  const desktopApps = getLaunchableUserApplications(state.processes);

  return (
    <main
      aria-label="Windows 11 Desktop Environment running GlassPane Window Opacity Utility"
      onClick={() => setSelectedDesktopIcon(null)}
      className="relative w-screen h-screen overflow-hidden select-none bg-[#070b14]"
    >
      {/* Windows 11 Bloom Wallpaper Background with Resilient CSS Fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060a14] via-[#0c1a38] to-[#081226]">
        {!wallpaperFailed && (
          <img
            src={WALLPAPER_PATH}
            alt="Windows 11 Desktop Wallpaper"
            referrerPolicy="no-referrer"
            onError={() => setWallpaperFailed(true)}
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-[#050811]/35 pointer-events-none" />
      </div>

      {/* Windows 11 Desktop Shortcut Icons (Left Column) */}
      <nav
        aria-label="Windows 11 Desktop Application Shortcuts"
        className="fixed left-2.5 top-3 bottom-14 z-[15] flex flex-col flex-wrap gap-1.5 content-start"
      >
        {/* Standalone GlassPane.exe Desktop Icon — Double-Click to Launch */}
        <button
          type="button"
          data-testid="desktop-shortcut-glasspane-exe"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDesktopIcon('glasspane-exe');
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleRelaunchApp();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleRelaunchApp();
            }
          }}
          title="Double-click GlassPane.exe to launch the application and system tray icon"
          className={`w-[74px] py-2 px-1 rounded-lg flex flex-col items-center gap-1 text-center transition-colors cursor-pointer group border ${
            selectedDesktopIcon === 'glasspane-exe'
              ? 'bg-sky-500/20 border-sky-400/50'
              : 'border-transparent hover:bg-white/10 active:bg-white/15'
          }`}
        >
          <div className="relative">
            <GlassPaneIcon
              className="w-8 h-8 drop-shadow-md"
              active={true}
            />
          </div>
          <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] line-clamp-2 leading-tight">
            GlassPane.exe
          </span>
        </button>

        {/* Desktop User Applications */}
        {desktopApps.map((app) => {
          const isRunning = app.hasOpenWindow && !app.isClosed;
          const isSelected = selectedDesktopIcon === app.id;
          return (
            <button
              key={app.id}
              type="button"
              data-testid={`desktop-shortcut-${app.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDesktopIcon(app.id);
                handleOpenWindow(app.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleOpenWindow(app.id);
              }}
              title={
                isRunning
                  ? `${app.appName} is running (Click to focus)`
                  : `Click to open ${app.appName} and populate it in GlassPane`
              }
              className={`w-[74px] py-2 px-1 rounded-lg flex flex-col items-center gap-1 text-center transition-colors cursor-pointer group border ${
                isSelected
                  ? 'bg-white/15 border-white/30'
                  : 'border-transparent hover:bg-white/10 active:bg-white/15'
              }`}
            >
              <div className="relative">
                <AppWindowIcon
                  appId={app.id}
                  category={app.category}
                  className="w-8 h-8 drop-shadow-md"
                  grayscale={false}
                />
              </div>
              <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] line-clamp-2 leading-tight">
                {app.appName}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Open Windows 11 Desktop Applications */}
      {openWindows.map((proc) => (
        <SimulatedDesktopWindow
          key={proc.id}
          process={proc}
          state={state}
          isSelected={state.selectedWindowId === proc.id}
          onFocusWindow={handleFocusDesktopWindow}
          onMinimizeWindow={handleMinimizeWindow}
          onCloseWindow={handleCloseWindow}
          onMoveWindow={handleMoveWindow}
        />
      ))}

      {/* GlassPane Windows 11 Utility Window */}
      <GlassPaneUtilityWindow
        state={state}
        onToggleGlobalOpacity={handleToggleGlobalOpacity}
        onToggleSingleWindow={handleToggleSingleWindow}
        onFocusWindow={handleFocusDesktopWindow}
        onChangeWindowOpacity={handleChangeWindowOpacity}
        onMinimizeToTray={() => setState((prev) => ({ ...prev, isUtilityWindowOpen: false }))}
        onToggleTheme={handleToggleTheme}
        onRestoreClosedWindows={handleRestoreClosedWindows}
      />

      {/* Standard Windows 11 Taskbar & System Tray (GlassPane Tray Icon appears when GlassPane.exe is running) */}
      <Win11TaskbarAndTray
        state={state}
        onClickTrayGlassPaneIcon={handleClickTrayGlassPaneIcon}
        onToggleGlobalOpacity={handleToggleGlobalOpacity}
        onResetAllOpacities={handleResetAllOpacities}
        onExitApplication={handleExitApp}
        onRelaunchApplication={handleRelaunchApp}
        onFocusOrRestoreAppWindow={handleFocusDesktopWindow}
        onOpenAppWindow={handleOpenWindow}
        onCloseAppWindow={handleCloseWindow}
        onSpawnCustomApp={handleSpawnCustomApp}
      />
    </main>
  );
}
