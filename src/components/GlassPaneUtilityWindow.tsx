import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Minus,
  Square,
  X,
  Sun,
  Moon,
  PlusCircle,
} from 'lucide-react';
import {
  GlassPaneState,
  getOpenApplicationWindows,
  resolveProcessColorScheme,
  MIN_OPACITY_PERCENT,
  MAX_OPACITY_PERCENT,
} from '../utils/windowManager';
import { AppWindowIcon, GlassPaneIcon } from './AppIcons';

interface GlassPaneUtilityWindowProps {
  state: GlassPaneState;
  onToggleGlobalOpacity: () => void;
  onToggleSingleWindow: (id: string) => void;
  onFocusWindow: (id: string) => void;
  onChangeWindowOpacity: (id: string, newPercent: number) => void;
  onMinimizeToTray: () => void;
  onToggleTheme: () => void;
  onRestoreClosedWindows: () => void;
}

export function GlassPaneUtilityWindow({
  state,
  onToggleGlobalOpacity,
  onToggleSingleWindow,
  onFocusWindow,
  onChangeWindowOpacity,
  onMinimizeToTray,
  onToggleTheme,
  onRestoreClosedWindows,
}: GlassPaneUtilityWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);

  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  });
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);

  const openWindows = getOpenApplicationWindows(state.processes);
  const isLight = state.win11Theme === 'light';

  const updateScrollMetrics = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollMetrics({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, []);

  useEffect(() => {
    updateScrollMetrics();
  }, [openWindows.length, state.isUtilityWindowOpen, updateScrollMetrics]);

  if (!state.isAppRunning || !state.isUtilityWindowOpen) {
    return null;
  }

  const getTrackPositionPercent = (val: number) => {
    const clamped = Math.min(MAX_OPACITY_PERCENT, Math.max(MIN_OPACITY_PERCENT, val));
    return ((clamped - MIN_OPACITY_PERCENT) / (MAX_OPACITY_PERCENT - MIN_OPACITY_PERCENT)) * 100;
  };

  const hasOverflow = scrollMetrics.scrollHeight > scrollMetrics.clientHeight + 2;
  const thumbHeightPercent = hasOverflow
    ? Math.max(18, (scrollMetrics.clientHeight / scrollMetrics.scrollHeight) * 100)
    : 100;
  const maxScrollTop = Math.max(1, scrollMetrics.scrollHeight - scrollMetrics.clientHeight);
  const thumbTopPercent = hasOverflow
    ? (scrollMetrics.scrollTop / maxScrollTop) * (100 - thumbHeightPercent)
    : 0;

  const handleScrollbarThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingScrollbar(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = scrollContainerRef.current?.scrollTop ?? 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleScrollbarThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar || !scrollContainerRef.current || !scrollbarTrackRef.current) return;
    const trackRect = scrollbarTrackRef.current.getBoundingClientRect();
    const deltaY = e.clientY - dragStartYRef.current;
    const scrollableTrackPx = Math.max(1, trackRect.height * (1 - thumbHeightPercent / 100));
    const scrollDelta = (deltaY / scrollableTrackPx) * maxScrollTop;
    scrollContainerRef.current.scrollTop = dragStartScrollTopRef.current + scrollDelta;
    updateScrollMetrics();
  };

  const handleScrollbarThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar) return;
    setIsDraggingScrollbar(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleScrollbarTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current || !scrollbarTrackRef.current) return;
    if ((e.target as HTMLElement).dataset.testid === 'glasspane-scrollbar-thumb') return;
    const trackRect = scrollbarTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientY - trackRect.top) / Math.max(1, trackRect.height);
    scrollContainerRef.current.scrollTop =
      clickRatio * (scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight);
    updateScrollMetrics();
  };

  return (
    <aside
      aria-label="GlassPane Windows 11 Window Opacity Controller"
      data-testid="glasspane-utility-window"
      className={`fixed left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 z-[65] w-[540px] max-w-[calc(100vw-24px)] rounded-2xl border shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-2xl flex flex-col overflow-hidden transition-colors duration-150 ${
        isLight
          ? 'bg-slate-100/95 border-slate-300 text-slate-900'
          : 'bg-[#1b1d22]/95 border-[#2e323b] text-slate-100'
      }`}
    >
      {/* Windows 11 Title Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <GlassPaneIcon className="w-4 h-4 shrink-0" active={state.globalOpacityEnabled} />
          <h1 className="text-[13px] font-medium tracking-wide whitespace-nowrap shrink-0">
            GlassPane
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isLight ? 'dark' : 'light'} Windows 11 theme`}
            title="Toggle Windows 11 Dark / Light Mica Theme"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onMinimizeToTray}
            aria-label="Minimize GlassPane to system tray"
            title="Minimize to System Tray"
            className={`px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (openWindows.length > 0) {
                onFocusWindow(openWindows[0].id);
              }
            }}
            aria-label="Maximize GlassPane"
            className={`px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMinimizeToTray}
            aria-label="Close GlassPane window to system tray"
            title="Hide to System Tray (Right-click tray icon to Exit)"
            className="px-2.5 py-1.5 rounded text-slate-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top-Right Master ON / OFF Switch Row */}
      <div className="flex items-center justify-end px-6 pt-1 pb-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium tracking-wide select-none ${
              isLight ? 'text-slate-800' : 'text-slate-100'
            }`}
          >
            {state.globalOpacityEnabled ? 'ON' : 'OFF'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={state.globalOpacityEnabled}
            aria-label="Toggle opacity settings on or off for all applications"
            data-testid="master-opacity-toggle"
            onClick={onToggleGlobalOpacity}
            className={`relative w-12 h-6 rounded-full transition-colors duration-150 cursor-pointer flex items-center px-1 ${
              state.globalOpacityEnabled
                ? 'bg-[#3898ff]'
                : isLight
                ? 'bg-slate-300'
                : 'bg-[#323640]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full transition-transform duration-150 ${
                state.globalOpacityEnabled
                  ? 'translate-x-6 bg-[#18202c]'
                  : 'translate-x-0 bg-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Inner Rounded Container holding the Dynamic Open Application List + Right Scrollbar */}
      <div className="px-4 pb-4">
        <div
          className={`relative rounded-xl border p-3 pr-5 flex items-stretch ${
            isLight
              ? 'bg-slate-200/75 border-slate-300'
              : 'bg-[#202228]/90 border-[#2e323b]'
          }`}
        >
          {/* Scrollable Applications Viewport (Supports Mouse Scroll Wheel & Scrollbar Dragging) */}
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollMetrics}
            role="list"
            aria-label="Open Windows List"
            data-testid="open-windows-scroll-container"
            className="flex-1 space-y-2.5 max-h-[430px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {openWindows.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No open application windows are currently running.
                </p>
                <button
                  type="button"
                  onClick={onRestoreClosedWindows}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3898ff] text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Open Demo Applications</span>
                </button>
              </div>
            ) : (
              openWindows.map((win) => {
                // Requirement 2: Each application bar toggles ON or OFF independently of each other.
                // When OFF (!win.isTransparencyActive), it stays in grayscale.
                // When ON (win.isTransparencyActive), it adopts the application's color scheme (or Gold Gradient if unidentified).
                const isBarActive = win.isTransparencyActive && state.globalOpacityEnabled;
                const palette = resolveProcessColorScheme(win);
                const thumbPos = getTrackPositionPercent(win.opacityPercent);

                const cardStyle: React.CSSProperties = isBarActive
                  ? {
                      background: isLight ? palette.lightCardBg : palette.cardBg,
                      borderColor: isLight ? palette.lightCardBorder : palette.cardBorder,
                    }
                  : {
                      background: isLight
                        ? 'rgba(248, 250, 252, 0.85)'
                        : 'linear-gradient(135deg, rgba(43, 46, 53, 0.82) 0%, rgba(36, 39, 45, 0.88) 100%)',
                      borderColor: isLight ? '#cbd5e1' : '#3d414a',
                    };

                const activeTrackColor = isBarActive
                  ? palette.sliderTrack
                  : isLight
                  ? '#64748b'
                  : '#717885';

                const unfilledTrackColor = isBarActive
                  ? palette.sliderUnfilled
                  : isLight
                  ? 'rgba(148, 163, 184, 0.38)'
                  : 'rgba(148, 163, 184, 0.25)';

                const thumbFillColor = isBarActive
                  ? palette.thumbFill
                  : isLight
                  ? '#64748b'
                  : '#8b929e';

                const thumbRingColor = isBarActive
                  ? palette.thumbRing
                  : 'rgba(148, 163, 184, 0.25)';

                return (
                  <div
                    key={win.id}
                    role="listitem"
                    data-testid={`open-window-row-${win.id}`}
                    data-bar-active={isBarActive ? 'true' : 'false'}
                    data-color-theme={win.hasIdentifiedColorTheme ? 'brand' : 'gold-gradient'}
                    style={cardStyle}
                    onClick={() => onFocusWindow(win.id)}
                    className="rounded-lg border px-4 py-3 transition-all duration-150 flex items-center justify-between gap-4 select-none"
                  >
                    {/* Left Side: Click App Icon or Name to Toggle this Application Bar ON (Colored) or OFF (Grayscale) Independently */}
                    <button
                      type="button"
                      data-testid={`toggle-app-bar-${win.id}`}
                      aria-pressed={win.isTransparencyActive}
                      aria-label={`Toggle ${win.appName} opacity ${win.isTransparencyActive ? 'off' : 'on'}`}
                      title={
                        win.isTransparencyActive
                          ? `${win.appName} is ON (Click to turn OFF / grayscale)`
                          : `${win.appName} is OFF (Click to turn ON / colored)`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSingleWindow(win.id);
                      }}
                      className="flex items-center gap-3.5 shrink-0 whitespace-nowrap text-left cursor-pointer focus:outline-none group"
                    >
                      <AppWindowIcon
                        appId={win.id}
                        category={win.category}
                        className="w-8 h-8 shrink-0"
                        grayscale={!isBarActive}
                      />
                      <span
                        className={`text-[15px] font-medium whitespace-nowrap transition-colors ${
                          isBarActive
                            ? isLight
                              ? 'text-slate-950 font-semibold'
                              : 'text-white font-medium'
                            : isLight
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {win.appName}
                      </span>
                    </button>

                    {/* Right Side: Horizontal Tick-Marked Opacity Slider Nested Inside Rectangle */}
                    <div
                      className="w-[216px] shrink-0 flex flex-col justify-center pr-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Top Row: Floating Current Opacity % above Thumb + 100% at right end */}
                      <div className="relative h-4 mb-1 text-[11px] font-mono tabular-nums">
                        {win.opacityPercent < 94 && (
                          <span
                            style={{ left: `${thumbPos}%` }}
                            className={`absolute -translate-x-1/2 font-medium whitespace-nowrap ${
                              isBarActive
                                ? isLight
                                  ? 'text-slate-900'
                                  : 'text-slate-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {win.opacityPercent}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onChangeWindowOpacity(win.id, 100)}
                          style={{ left: '100%' }}
                          className={`absolute -translate-x-1/2 font-mono tabular-nums cursor-pointer hover:underline whitespace-nowrap ${
                            isBarActive
                              ? isLight
                                ? 'text-slate-800'
                                : 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          100%
                        </button>
                      </div>

                      {/* Middle Row: Track with 25%, 50%, 75%, 100% Vertical Tick Marks & Custom Thumb */}
                      <div className="relative h-5 flex items-center">
                        <div
                          style={{ backgroundColor: unfilledTrackColor }}
                          className="w-full h-[3px] rounded-full"
                        />

                        <div
                          style={{
                            width: `${thumbPos}%`,
                            backgroundColor: activeTrackColor,
                          }}
                          className="absolute left-0 h-[3px] rounded-full pointer-events-none"
                        />

                        {[25, 50, 75, 100].map((tick) => {
                          const tickLeft = getTrackPositionPercent(tick);
                          const isPassed = win.opacityPercent >= tick;
                          return (
                            <span
                              key={tick}
                              style={{
                                left: `${tickLeft}%`,
                                backgroundColor: isPassed ? activeTrackColor : unfilledTrackColor,
                              }}
                              className="absolute -translate-x-1/2 w-[1.5px] h-3.5 rounded-full pointer-events-none"
                            />
                          );
                        })}

                        <div
                          style={{
                            left: `${thumbPos}%`,
                            backgroundColor: thumbRingColor,
                          }}
                          className="absolute -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-75"
                        >
                          <div
                            style={{ backgroundColor: thumbFillColor }}
                            className="w-2.5 h-2.5 rounded-full shadow-xs"
                          />
                        </div>

                        <input
                          type="range"
                          min={MIN_OPACITY_PERCENT}
                          max={MAX_OPACITY_PERCENT}
                          step={1}
                          value={win.opacityPercent}
                          aria-label={`${win.appName} opacity percentage`}
                          onChange={(e) => onChangeWindowOpacity(win.id, Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </div>

                      {/* Bottom Row: Clickable 25%, 50%, 75% Preset Tick Labels */}
                      <div className="relative h-4 mt-1 text-[11px] font-mono tabular-nums">
                        {[25, 50, 75].map((tick) => {
                          const tickLeft = getTrackPositionPercent(tick);
                          return (
                            <button
                              key={tick}
                              type="button"
                              onClick={() => onChangeWindowOpacity(win.id, tick)}
                              style={{ left: `${tickLeft}%` }}
                              className={`absolute -translate-x-1/2 cursor-pointer transition-colors hover:underline whitespace-nowrap ${
                                isBarActive
                                  ? isLight
                                    ? 'text-slate-700 hover:text-slate-950'
                                    : 'text-slate-300 hover:text-white'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {tick}%
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Requirement 5: Interactive Right-Hand Scrollbar Track & Draggable Thumb */}
          {openWindows.length > 4 && (
            <div
              ref={scrollbarTrackRef}
              onClick={handleScrollbarTrackClick}
              data-testid="glasspane-scrollbar-track"
              aria-label="Application list scrollbar"
              className={`absolute right-1.5 top-3 bottom-3 w-2 rounded-full cursor-pointer ${
                isLight ? 'bg-slate-300/80' : 'bg-[#15171c]'
              }`}
            >
              <div
                data-testid="glasspane-scrollbar-thumb"
                onPointerDown={handleScrollbarThumbPointerDown}
                onPointerMove={handleScrollbarThumbPointerMove}
                onPointerUp={handleScrollbarThumbPointerUp}
                style={{
                  height: `${thumbHeightPercent}%`,
                  top: `${thumbTopPercent}%`,
                }}
                className={`absolute inset-x-0 rounded-full cursor-grab active:cursor-grabbing transition-colors ${
                  isDraggingScrollbar
                    ? 'bg-sky-400'
                    : isLight
                    ? 'bg-slate-500 hover:bg-slate-600'
                    : 'bg-[#4b5262] hover:bg-[#646d82]'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
