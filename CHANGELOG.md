# Changelog

All notable changes to the GlassPane application since its initial release are documented in this file.

---

## [1.4.2] - 2026-11-18

### Added
- Added `.github/workflows/release.yml` GitHub Actions workflow to automatically compile `GlassPane.exe` from the `/Source` directory using MinGW-w64 (`windres` + `g++`) and attach it whenever a new GitHub Release is published.
- Added manual `workflow_dispatch` support (`release_tag` input supporting any release tag or `latest`) to compile and attach `GlassPane.exe` to any chosen GitHub Release on demand.

---

## [1.4.1] - 2026-11-14

### Changed
- Rewrote `README.md` in clear, accessible language tailored for everyday Windows 11 users.
- Reorganized low-level architectural specifications, Win32 and GDI+ implementation details, and compiler build instructions into a dedicated Technical Information section in `README.md`.

### Added
- Created `CHANGELOG.md` in the root directory to document the full revision history of the application from version 1.0.0 to present.

---

## [1.4.0] - 2026-11-14

### Added
- Implemented single-instance enforcement in both the native C++ executable (`Local\GlassPane_Win11_SingleInstance_Mutex` and `GlassPane_Win11_SingleInstance_Activate`) and the web environment so launching `GlassPane.exe` while an instance is already running restores and brings the existing GlassPane window to the foreground instead of spawning a second instance.
- Added continuous horizontal marquee scrolling for long application sub-window titles so full document names, browser tab titles, and media track names remain completely readable when they exceed the width of the title column.
- Added handling for the Windows `TaskbarCreated` shell message so the GlassPane system tray icon automatically re-registers if Windows Explorer (`explorer.exe`) restarts.
- Added `WM_CAPTURECHANGED` handling in the native window procedure to cleanly reset slider and scrollbar drag states if mouse capture is interrupted.
- Added a `ResizeObserver` to the web utility window viewport to keep custom scrollbar thumb metrics synchronized when the window list changes.

### Fixed
- Fixed right-side card border clipping in the scrollable viewport by insetting application card horizontal bounds within the clipping rectangle.
- Adjusted opacity slider width and right padding (`SLIDER_WIDTH = 200`, `SLIDER_RIGHT_PAD = 26`) so the `100%` preset label renders cleanly inside the right border of every application card without overhanging or clipping.
- Fixed potential timer and handle leaks on application exit by explicitly stopping `ID_TIMER_ENUM` and `ID_TIMER_MARQUEE`, clearing cached GDI+ resources prior to `GdiplusShutdown`, and releasing the single-instance mutex handle.

---

## [1.3.0] - 2026-11-14

### Added
- Added tracking for the `WS_EX_LAYERED` extended window style (`addedLayeredStyle`) per window so GlassPane removes the layered style bit when a window's transparency is turned off or when exiting the application, avoiding unnecessary Desktop Window Manager composition overhead.
- Added Windows User Interface Privilege Isolation (UIPI) error detection (`GetLastError` checks on `SetWindowLongPtrW` and `SetLayeredWindowAttributes`) to gracefully revert a window's card state to `OFF` (`100%`) if an elevated administrator process denies access.

### Fixed
- Fixed a GDI+ memory leak and potential `HWND` reuse issue by pruning closed or invalidated window handles from both the icon bitmap cache (`g_iconCache`) and window state map (`g_windowStates`) on every window list refresh.
- Improved PowerShell build instructions in `README.md` to automatically locate the WinGet MinGW-w64 `bin` directory in the current terminal session and terminate any running `GlassPane.exe` background process prior to linking.

---

## [1.2.0] - 2026-11-14

### Added
- Built a custom double-buffered GDI+ rendering engine (`PaintGlassPaneCanvas`) in `Source/GlassPane.cpp` to replace standard grey Win32 `ListView` and `Trackbar` controls with a dark (`#1b1d22` / `#202228`) and light (`#f1f5f9` / `#e2e8f0`) Windows 11 card interface.
- Added real 32-bit ARGB `.exe` icon extraction (`WM_GETICON`, window class icons, and `SHGetFileInfoW`) with alpha-channel preservation and automatic grayscale desaturation when an application card is toggled off.
- Added signature brand color gradients for recognized applications (Discord, Mozilla Firefox, Spotify, Google Chrome, Microsoft Edge, Steam, File Explorer, System Settings, and Windows PowerShell) along with a default Gold Gradient fallback palette for all other applications.
- Added inline tick-marked opacity sliders (`10%` to `100%`) inside each application card with vertical tick marks and clickable preset labels at `25%`, `50%`, `75%`, and `100%`, plus a floating current percentage readout.
- Added independent per-application ON/OFF toggling by clicking the left side (icon or title) of any application card.
- Added a top-left Dark UI / Light UI theme switch and a custom right-hand draggable scrollbar for navigating long lists of open windows.

---

## [1.1.0] - 2026-11-14

### Added
- Added standalone native C++ source files in the `Source/` directory (`Source/GlassPane.cpp`, `Source/GlassPane.rc`, and `Source/GlassPane.ico`) for compiling a portable `GlassPane.exe` binary with zero external DLL dependencies.
- Embedded a multi-resolution (`16x16`, `32x32`, `48x48`) 32-bit ARGB frosted blue GlassPane icon resource used consistently across the `.exe` file, window title bar, and Windows 11 system tray.
- Added a `GlassPane.exe` desktop shortcut in the interactive Windows 11 simulation to demonstrate launching, minimizing to the system tray, and exiting from the tray context menu.

### Changed
- Removed auxiliary status bars and non-native taskbar elements so the utility operates strictly through its main window and the Windows 11 system tray.

---

## [1.0.0] - 2026-11-14

### Added
- Initial release of GlassPane for Windows 11.
- Implemented core real-time window opacity control (`10%` to `100%`) utilizing Win32 layered window attributes (`WS_EX_LAYERED` and `LWA_ALPHA`).
- Implemented automatic top-level application window discovery (`EnumWindows`) that filters out hidden windows, tool windows (`WS_EX_TOOLWINDOW`), shell background hosts, and Desktop Window Manager cloaked processes (`DWMWA_CLOAKED`).
- Added Windows 11 system tray integration (`Shell_NotifyIconW`) with left-click window toggling and a right-click context menu to open the utility, toggle master opacity, reset all windows to 100%, or exit cleanly while restoring all windows to full opacity.
- Created the interactive Windows 11 desktop preview environment featuring draggable application windows, live opacity rendering, taskbar and system tray simulation, and unit test coverage for window state management.
