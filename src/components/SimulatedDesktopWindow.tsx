import React, { useState, useRef } from 'react';
import {
  Minus,
  Square,
  X,
  Globe,
  Lock,
  Volume2,
  Play,
  SkipForward,
  SkipBack,
  Hash,
  Send,
  Settings,
  Gamepad2,
  Search,
  FileText,
  Terminal,
  Calculator,
} from 'lucide-react';
import {
  ProcessEntry,
  GlassPaneState,
  computeEffectiveOpacity,
} from '../utils/windowManager';
import { AppWindowIcon } from './AppIcons';

interface SimulatedDesktopWindowProps {
  process: ProcessEntry;
  state: GlassPaneState;
  isSelected: boolean;
  onFocusWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMoveWindow: (id: string, x: number, y: number) => void;
}

export function SimulatedDesktopWindow({
  process,
  state,
  isSelected,
  onFocusWindow,
  onMinimizeWindow,
  onCloseWindow,
  onMoveWindow,
}: SimulatedDesktopWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  if (process.isClosed || process.isMinimized || !process.hasOpenWindow || process.isBackgroundProcess) {
    return null;
  }

  const effectiveOpacity = computeEffectiveOpacity(process, state);

  const handleTitleBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocusWindow(process.id);
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - process.rect.x,
      y: e.clientY - process.rect.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTitleBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextX = Math.max(8, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x));
    const nextY = Math.max(8, Math.min(window.innerHeight - 140, e.clientY - dragOffset.current.y));
    onMoveWindow(process.id, nextX, nextY);
  };

  const handleTitleBarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      style={{
        left: `${process.rect.x}px`,
        top: `${process.rect.y}px`,
        width: `${process.rect.width}px`,
        height: `${process.rect.height}px`,
        zIndex: isSelected ? 35 : process.zIndex,
        opacity: effectiveOpacity / 100,
      }}
      onMouseDown={() => onFocusWindow(process.id)}
      className={`fixed select-none rounded-xl overflow-hidden flex flex-col border transition-opacity duration-75 shadow-2xl ${
        isSelected
          ? 'border-sky-400/70 ring-1 ring-sky-400/30'
          : 'border-slate-700/80'
      } bg-slate-900 text-slate-100`}
      data-testid={`desktop-window-${process.id}`}
      data-effective-opacity={effectiveOpacity}
    >
      {/* Windows 11 Standard Title Bar */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        className="h-9 px-3 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AppWindowIcon
            appId={process.id}
            category={process.category}
            className="w-4 h-4 shrink-0"
            grayscale={false}
          />
          <span className="text-xs font-medium text-slate-200 truncate">
            {process.windowTitle}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimizeWindow(process.id);
            }}
            aria-label={`Minimize ${process.appName}`}
            className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocusWindow(process.id);
            }}
            aria-label={`Maximize ${process.appName}`}
            className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCloseWindow(process.id);
            }}
            aria-label={`Close ${process.appName}`}
            data-testid={`close-window-${process.id}`}
            className="p-1.5 text-slate-400 hover:bg-rose-600 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realistic Application Window Body Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {process.id === 'win-discord' && <DiscordWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-firefox' && <FirefoxWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-spotify' && <SpotifyWindowBody />}
        {process.id === 'win-chrome' && <ChromeWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-settings' && <SettingsWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-steam' && <SteamWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-notepad' && <NotepadWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-terminal' && <TerminalWindowBody effectiveOpacity={effectiveOpacity} />}
        {process.id === 'win-calculator' && <CalculatorWindowBody effectiveOpacity={effectiveOpacity} />}
        {![
          'win-discord',
          'win-firefox',
          'win-spotify',
          'win-chrome',
          'win-settings',
          'win-steam',
          'win-notepad',
          'win-terminal',
          'win-calculator',
        ].includes(process.id) && (
          <CustomAppWindowBody appName={process.appName} effectiveOpacity={effectiveOpacity} />
        )}
      </div>
    </div>
  );
}

function DiscordWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex bg-[#1e1f22] text-slate-200 text-xs overflow-hidden">
      <div className="w-36 bg-[#2b2d31] border-r border-black/20 p-2.5 flex flex-col gap-1 shrink-0">
        <div className="text-[11px] font-semibold text-slate-300 px-1.5 py-1 mb-1">
          Windows Dev Guild
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#404249] text-white font-medium">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">win32-dwm</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-400">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">Voice Lounge</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between p-3 bg-[#313338]">
        <div className="space-y-2.5 overflow-y-auto">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-indigo-400">alex_win11</span>
              <span className="text-[10px] text-slate-400 font-mono tabular-nums">Opacity: {effectiveOpacity}%</span>
            </div>
            <p className="text-slate-200 mt-0.5 leading-relaxed">
              Keeping Discord at {effectiveOpacity}% opacity lets you monitor team messages while seeing code or docs right through the window.
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#383a40] text-slate-400">
          <span>Message #win32-dwm</span>
          <Send className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function FirefoxWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 text-xs">
      <div className="px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700 rounded-lg px-2.5 py-1 flex-1 text-slate-300">
          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate font-mono text-[11px]">
            https://learn.microsoft.com/windows/win32/winmsg/using-layered-windows
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2 overflow-y-auto flex-1 bg-slate-900/95">
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
          <Globe className="w-3.5 h-3.5" />
          <span>Mozilla Firefox · DWM Layered Alpha: {effectiveOpacity}%</span>
        </div>
        <h3 className="text-sm font-bold text-white">
          SetLayeredWindowAttributes (WS_EX_LAYERED)
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Sets the opacity and transparency color key of a layered window on Windows 11 via hardware-accelerated Desktop Window Manager composition.
        </p>
      </div>
    </div>
  );
}

function SpotifyWindowBody() {
  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-950 text-slate-200 p-3.5 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shrink-0">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-emerald-400 font-medium">Spotify · Now Playing</div>
          <div className="text-sm font-bold text-white truncate">Dive — Late Night Coding Mix</div>
          <div className="text-xs text-slate-400 truncate">Tycho · Ambient Instrumental</div>
        </div>
      </div>
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SkipBack className="w-3.5 h-3.5 text-slate-400" />
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
            <Play className="w-3 h-3 fill-current" />
          </div>
          <SkipForward className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex-1 mx-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="w-2/3 h-full bg-emerald-500 rounded-full" />
        </div>
        <span className="font-mono text-[11px] text-slate-400 tabular-nums">03:28</span>
      </div>
    </div>
  );
}

function ChromeWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 text-xs">
      <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 rounded-full px-3 py-1 flex-1 text-slate-300">
          <Search className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="truncate font-mono text-[11px]">
            https://developer.chrome.com/docs/chromium/windows-dwm
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2 flex-1">
        <div className="text-[11px] text-sky-400 font-medium">
          Google Chrome · Window Opacity {effectiveOpacity}%
        </div>
        <h3 className="text-sm font-bold text-white">
          Chromium Win32 Aura Compositor &amp; GlassPane Overlay
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Each application bar inside GlassPane toggles ON (brand color) or OFF (grayscale) independently.
        </p>
      </div>
    </div>
  );
}

function SettingsWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900/95 text-slate-200 p-4 text-xs space-y-2.5">
      <div className="flex items-center gap-2 text-sky-400 font-medium">
        <Settings className="w-4 h-4" />
        <span>Windows 11 System Settings · Personalization</span>
      </div>
      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
        <span>Transparency Effects (Mica / Acrylic)</span>
        <span className="font-mono text-sky-400 tabular-nums">{effectiveOpacity}% Alpha</span>
      </div>
    </div>
  );
}

function SteamWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-[#171a21] text-slate-200 p-4 text-xs space-y-2.5">
      <div className="flex items-center gap-2 text-sky-300 font-semibold">
        <Gamepad2 className="w-4 h-4" />
        <span>Steam Library · Window Opacity {effectiveOpacity}%</span>
      </div>
      <div className="p-2.5 rounded-lg bg-[#1b2838] border border-[#2a475e] text-slate-300">
        Overlay guide &amp; achievement tracker running at {effectiveOpacity}% opacity.
      </div>
    </div>
  );
}

function NotepadWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-stone-900 text-stone-200 p-4 font-mono text-xs space-y-2">
      <div className="flex items-center gap-2 text-amber-400 font-sans font-medium text-[11px]">
        <FileText className="w-3.5 h-3.5" />
        <span>Notepad · Default Gold Gradient Theme ({effectiveOpacity}% Opacity)</span>
      </div>
      <p className="text-stone-300 leading-relaxed">
        Applications without a predefined brand color automatically adopt the standard Gold Gradient inside GlassPane when toggled ON.
      </p>
    </div>
  );
}

function TerminalWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-black/95 text-amber-300 p-4 font-mono text-xs space-y-1.5">
      <div className="flex items-center gap-2 text-amber-400 font-semibold">
        <Terminal className="w-3.5 h-3.5" />
        <span>PS C:\Users\Developer\GlassPane&gt;</span>
      </div>
      <div className="text-slate-300">
        EnumWindows active · Window Alpha: {effectiveOpacity}% (Gold Gradient fallback)
      </div>
    </div>
  );
}

function CalculatorWindowBody({ effectiveOpacity }: { effectiveOpacity: number }) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 p-4 text-xs space-y-2">
      <div className="flex items-center justify-between text-amber-400 font-medium">
        <span className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          <span>Programmer Calculator</span>
        </span>
        <span className="font-mono tabular-nums">{effectiveOpacity}%</span>
      </div>
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-right font-mono text-lg text-amber-300 tabular-nums">
        0x{Math.round((effectiveOpacity / 100) * 255).toString(16).toUpperCase().padStart(2, '0')} ({Math.round((effectiveOpacity / 100) * 255)})
      </div>
    </div>
  );
}

function CustomAppWindowBody({
  appName,
  effectiveOpacity,
}: {
  appName: string;
  effectiveOpacity: number;
}) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 p-4 text-xs space-y-2">
      <div className="text-amber-400 font-semibold">
        {appName} · Standard Gold Gradient Theme ({effectiveOpacity}% Opacity)
      </div>
      <p className="text-slate-300 leading-relaxed">
        Dynamically opened third-party window. Because no brand color theme is registered for {appName}, GlassPane assigns the default Gold Gradient when its bar is toggled ON.
      </p>
    </div>
  );
}
