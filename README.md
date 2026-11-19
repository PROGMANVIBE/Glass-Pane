# GlassPane

GlassPane is a lightweight Windows 11 utility that lets you make any open application window see-through. Whether you are referencing notes while writing, following a tutorial while working in another program, or monitoring a chat window in the background, GlassPane allows you to layer windows on top of one another and see through them clearly.

---

## Key Features

- **No Installation Required**: GlassPane runs as a single portable program (`GlassPane.exe`). Simply double-click the file to open it—no installer or setup wizard is needed.
- **Automatic Window Detection**: Automatically finds and lists the applications you currently have open on your desktop while ignoring hidden background system tasks.
- **Simple Transparency Controls**: Use the smooth slider on any application card to adjust its visibility between 10% (almost completely see-through) and 100% (solid), or click the 25%, 50%, 75%, or 100% quick-select labels.
- **One-Click Per-App Toggle**: Click an application's icon or name on the left side of its card to quickly turn transparency on or off for that specific window without losing your saved slider position.
- **Color-Coded Application Cards**: Active applications light up in their recognizable brand colors (such as Discord, Firefox, Chrome, Edge, Spotify, Steam, and File Explorer) or a warm gold theme for other programs. Inactive applications appear in neutral grayscale so you can tell at a glance which windows are being modified.
- **Readable Scrolling Window Titles**: When an open window has a long title—such as a long document name, website tab, or song title—it smoothly scrolls across the card so you can always read the full text.
- **Master ON / OFF Switch**: Instantly pause or resume transparency across all of your open windows at once using the master switch in the top-right corner.
- **Dark and Light Appearance**: Switch between Dark UI and Light UI at any time using the button in the top-left corner to match your Windows 11 desktop preference.
- **Quiet System Tray Operation**: Minimizing or closing the GlassPane window tucks it neatly into the Windows 11 system tray near your clock, keeping your main taskbar uncluttered.
- **Single-Window Protection**: Opening `GlassPane.exe` when the program is already running in the background simply brings your existing GlassPane window to the front instead of opening duplicates.
- **Safe Automatic Reset**: When you exit GlassPane, all of your open windows are automatically restored to their normal, solid 100% appearance.

---

## How to Use GlassPane

1. **Open the Program**:
   Double-click **`GlassPane.exe`**. The GlassPane control window will appear on your screen, and a frosted blue window icon will be added to your Windows 11 system tray in the bottom-right corner of your screen.

2. **Make a Window See-Through**:
   Find the application you want to make transparent in the list. Drag the slider on the right side of its card to the left to make the window more see-through, or click **25%**, **50%**, **75%**, or **100%** for an exact level.

3. **Turn Transparency On or Off for One Window**:
   Click the application's icon or name on the left side of its row.
   - **Colored Card (ON)**: Transparency is active for that window.
   - **Grayscale Card (OFF)**: The window returns to normal (100% solid) until you click it again or move its slider.

4. **Pause or Resume Everything at Once**:
   Click the **ON / OFF** switch in the top-right corner of the GlassPane window to temporarily turn transparency off or back on for every window at the same time.

5. **Minimize to the System Tray**:
   Click the minimize (`-`) or close (`X`) button in the top-right corner of the GlassPane window to hide it to the Windows 11 system tray.
   - **Left-click** the system tray icon to show or hide the GlassPane window.
   - **Right-click** the system tray icon to open the quick menu, toggle Master Opacity, reset all windows to 100%, or exit the program.

6. **Exit GlassPane Completely**:
   Right-click the GlassPane icon in the Windows 11 system tray and select **Exit**. All windows will immediately return to 100% solid visibility.

7. **Working with Administrator Programs**:
   For security reasons, Windows prevents standard programs from changing the appearance of applications that are running as Administrator. If you want to make an Administrator window transparent, right-click **`GlassPane.exe`** and select **Run as administrator**.

---

## Technical Information

This section contains architecture details, Win32 API specifications, source file descriptions, and step-by-step compilation instructions for developers and advanced users who wish to inspect or build `GlassPane.exe` from source.

### Architecture and Native Implementation

- **Window Transparency Mechanism**: Uses the Win32 `WS_EX_LAYERED` extended window style and `SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA)` API to control per-window alpha composition via the Windows Desktop Window Manager (DWM), mapping `10%–100%` opacity to byte values `26–255`.
- **Clean Style Restoration**: Tracks whether `GlassPane.exe` originally applied the `WS_EX_LAYERED` bit to each target `HWND` (`addedLayeredStyle`). When a window's transparency is turned off or when `GlassPane.exe` exits, the alpha value is restored to `255` and `WS_EX_LAYERED` is stripped if it was added by GlassPane.
- **Top-Level Window Filtering**: Enumerates windows via `EnumWindows` every 2,000ms (`ID_TIMER_ENUM`) and on activation. Filters out invisible windows (`!IsWindowVisible`), tool windows (`WS_EX_TOOLWINDOW`), owned non-app windows, shell host classes (`Progman`, `WorkerW`, `Shell_TrayWnd`, `Shell_SecondaryTrayWnd`), and DWM-cloaked background windows (`DwmGetWindowAttribute` with `DWMWA_CLOAKED`).
- **Custom Double-Buffered GDI+ Renderer**: Renders the 540x540 client canvas using off-screen compatible DC/bitmap double buffering (`WM_PAINT`) and GDI+ anti-aliased vector paths (`Gdiplus::Graphics`, `LinearGradientBrush`, `ColorMatrix`). Applies Windows 11 rounded corners (`DWMWA_WINDOW_CORNER_PREFERENCE`), immersive dark/light title bars (`DWMWA_USE_IMMERSIVE_DARK_MODE`), and Mica system backdrop attributes (`DWMWA_SYSTEMBACKDROP_TYPE`).
- **Native 32-Bit ARGB Icon Extraction and Caching**: Extracts running application icons via `WM_GETICON` (`ICON_BIG`, `ICON_SMALL2`), window class icons (`GCLP_HICON`, `GCLP_HICONSM`), and `SHGetFileInfoW` on the process image path queried via `QueryFullProcessImageNameW`. Converts `HICON` handles into top-down 32-bit `PixelFormat32bppPARGB` GDI+ bitmaps and automatically prunes closed `HWND` entries on refresh to prevent memory leaks.
- **Sub-Window Title Marquee Engine**: Measures sub-window title widths using `Gdiplus::Graphics::MeasureString`. Titles that exceed the available column width scroll continuously at ~30 FPS (`ID_TIMER_MARQUEE`, `33ms` interval) using a clipped dual-copy horizontal loop with a `36px` separation gap.
- **Single-Instance Synchronization and Shell Resilience**: Acquires a named mutex (`Local\GlassPane_Win11_SingleInstance_Mutex`) at startup in `wWinMain`. Subsequent launches broadcast a registered window message (`GlassPane_Win11_SingleInstance_Activate`) to unhide, restore, and focus the primary window before exiting. Listens for the `TaskbarCreated` registered shell message to re-register the system tray icon if `explorer.exe` restarts, and handles `WM_CAPTURECHANGED` to safely release mouse capture states.
- **User Interface Privilege Isolation (UIPI) Safety**: Checks `GetLastError()` across `SetWindowLongPtrW` and `SetLayeredWindowAttributes`. If an elevated target process rejects modification with `ERROR_ACCESS_DENIED`, GlassPane immediately reverts the cached state for that window to `OFF` (`100%`).

### Source Directory Contents

All files required to compile the standalone `GlassPane.exe` binary are located in the **`Source/`** directory:

- **`Source/GlassPane.cpp`** — Native Win32, Desktop Window Manager (`dwmapi`), and GDI+ (`gdiplus`) C++ source code implementing the window enumerator, custom GDI+ UI, icon extractor, marquee renderer, single-instance guard, and system tray controller.
- **`Source/GlassPane.rc`** — Win32 resource script that embeds the application icon into the compiled executable.
- **`Source/GlassPane.ico`** — Multi-resolution (`16x16`, `32x32`, `48x48`) 32-bit ARGB icon used for the executable file, window title bar, and system tray.

### Required Dependencies to Build `GlassPane.exe`

To compile `GlassPane.exe` as a standalone binary from **Windows Terminal** or **PowerShell**, you need the **MinGW-w64 C++ Toolchain** (installed via Windows Package Manager `winget`):

1. **WinLibs MinGW-w64 (`BrechtSanders.WinLibs.POSIX.UCRT`)**:
   - Provides **`g++.exe`** (the C++ compiler and static linker).
   - Provides **`windres.exe`** (the GNU Windows Resource Compiler used to compile `Source/GlassPane.rc` and `Source/GlassPane.ico` into a COFF resource object).
2. **Windows SDK System Libraries** *(included with MinGW-w64)*:
   - Links against standard Win32 libraries: `user32`, `shell32`, `dwmapi`, `gdi32`, `comctl32`, and `gdiplus`.

### Step 1: Install Compiler Dependencies (PowerShell / Windows Terminal)

Open **PowerShell** or **Windows Terminal** and paste the following commands to install the MinGW-w64 C++ compiler toolchain via `winget` and add it to your active terminal `PATH`:

```powershell
winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT --accept-source-agreements --accept-package-agreements
$mingwBin = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages" | Get-ChildItem -Directory -Filter "BrechtSanders.WinLibs.POSIX.UCRT*" -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "mingw64\bin" }
if ($mingwBin -and (Test-Path $mingwBin)) { $env:Path = "$mingwBin;$env:Path" } else { $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") }
g++ --version
windres --version
```

### Step 2: Build Standalone `GlassPane.exe` (PowerShell / Windows Terminal)

Navigate to the root folder of this repository (the folder containing the **`Source`** directory) in **PowerShell** or **Windows Terminal**:

```powershell
cd "$HOME\Downloads\GlassPane"
```

*(Replace the path above with the actual folder where you saved or extracted the project.)*

Then paste the following commands to stop any running `GlassPane.exe` process, compile the icon resource, and statically link **`GlassPane.exe`** with zero external DLL dependencies:

```powershell
$mingwBin = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages" | Get-ChildItem -Directory -Filter "BrechtSanders.WinLibs.POSIX.UCRT*" -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "mingw64\bin" }
if ($mingwBin -and (Test-Path $mingwBin) -and ($env:Path -notlike "*$mingwBin*")) { $env:Path = "$mingwBin;$env:Path" }
Get-Process GlassPane -ErrorAction SilentlyContinue | Stop-Process -Force
windres Source/GlassPane.rc -O coff -o Source/GlassPane.res
g++ -O2 -municode -mwindows -static -static-libgcc -static-libstdc++ Source/GlassPane.cpp Source/GlassPane.res -o GlassPane.exe -luser32 -lshell32 -ldwmapi -lgdi32 -lcomctl32 -lgdiplus
Remove-Item Source/GlassPane.res -ErrorAction SilentlyContinue
Write-Host "Built standalone executable: $(Resolve-Path .\GlassPane.exe)" -ForegroundColor Green
```

Once compiled, `GlassPane.exe` is created directly in the project root directory and can be copied or moved anywhere on your Windows 11 PC.

### Automated GitHub Release Builds (`.github/workflows/release.yml`)

This repository includes a GitHub Actions workflow (**`.github/workflows/release.yml`**) that compiles `Source/GlassPane.cpp`, `Source/GlassPane.rc`, and `Source/GlassPane.ico` on a `windows-latest` runner using MinGW-w64 and attaches the standalone **`GlassPane.exe`** binary directly to your GitHub Releases:

1. **Automatic Compilation on New Release**:
   - Whenever you publish a new release on GitHub, the workflow automatically runs, compiles `GlassPane.exe` from the `/Source` folder, and uploads `GlassPane.exe` as a release asset on that release.
2. **Manual Run for Any Existing Release (`workflow_dispatch`)**:
   - Navigate to the **Actions** tab in your GitHub repository and select **Build and Attach GlassPane.exe to Release**.
   - Click **Run workflow**.
   - Enter the target release tag (for example, `v1.4.2`, or leave it set to `latest` to automatically target the most recent release) and click **Run workflow**.
   - The action will compile `GlassPane.exe` from `/Source`, upload it as a downloadable workflow artifact, and attach (or overwrite via `--clobber`) `GlassPane.exe` on the specified release.

