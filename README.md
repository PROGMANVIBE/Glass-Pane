# GlassPane

GlassPane is a lightweight Windows 11 system tray utility that lets you make any open application window see-through (`WS_EX_LAYERED` / `LWA_ALPHA`) so you can view and work with multiple windows layered on top of each other. Double-clicking **`GlassPane.exe`** opens the GlassPane control window and adds its frosted blue icon to the Windows 11 system tray.

---

## Key Features

- **Direct Portable Executable**: Launch **`GlassPane.exe`** directly without any installer or setup wizard. Double-clicking `GlassPane.exe` opens the application window and places the GlassPane icon in your Windows 11 system tray.
- **Matching App and System Tray Icon**: The compiled `GlassPane.exe` binary embeds `Source/GlassPane.ico`, displaying the same frosted blue window pane icon on the executable file, title bar, and Windows 11 system tray.
- **Uncluttered Windows 11 Taskbar**: GlassPane does not add extra bars or clutter to your main Windows 11 taskbar. When minimized or closed, it sits quietly in the bottom-right system tray.
- **Automatic List of Open Apps**: Automatically detects and lists only currently open, user-facing desktop application windows while ignoring background processes and cloaked system hosts.
- **Independent Per-Window Switches & Brand Colors**: Click any application inside GlassPane to toggle its transparency on or off independently. Active bars light up in the application's signature color scheme (or a gold gradient default if unidentified), while inactive bars appear in grayscale.
- **Tick-Marked Opacity Sliders & Master Switch**: Adjust transparency smoothly between 15% and 100% with quick preset stops at **25%**, **50%**, **75%**, and **100%**, or toggle all tracked windows at once using the top-right Master ON/OFF switch.
- **Clean Exit Restoration**: Right-clicking the system tray icon and selecting **Exit** immediately restores all open windows back to 100% solid opacity and removes the tray icon.

---

## `Source/` Folder Contents

All files required to compile the standalone `GlassPane.exe` binary are located in the **`Source/`** directory:

- **`Source/GlassPane.cpp`** — Native Win32, Desktop Window Manager (`dwmapi`), and GDI+ (`gdiplus`) C++ source code rendering the custom dark/light card UI, real `.exe` icons, brand color gradients, and inline tick-marked sliders.
- **`Source/GlassPane.rc`** — Win32 resource script that embeds the multi-resolution icon into the executable.
- **`Source/GlassPane.ico`** — Multi-resolution (`16x16`, `32x32`, `48x48`) 32-bit ARGB frosted blue GlassPane icon.

---

## Required Dependencies to Build `GlassPane.exe`

To compile `GlassPane.exe` as a standalone file from **Windows Terminal** or **PowerShell**, you need the **MinGW-w64 C++ Toolchain** (installed via Windows Package Manager `winget`):

1. **WinLibs MinGW-w64 (`BrechtSanders.WinLibs.POSIX.UCRT`)**:
   - Provides **`g++.exe`** (the C++ compiler and static linker).
   - Provides **`windres.exe`** (the GNU Windows Resource Compiler used to compile `Source/GlassPane.rc` and `Source/GlassPane.ico` into an embedded COFF resource object).
2. **Windows SDK System Libraries** *(included with MinGW-w64)*:
   - Links against standard Win32 libraries: `user32`, `shell32`, `dwmapi`, `gdi32`, `comctl32`, and `gdiplus`.

---

## Copy-Paste Section 1: Install All Dependencies (PowerShell / Windows Terminal)

Open **PowerShell** or **Windows Terminal** and paste the following block to install the MinGW-w64 C++ compiler toolchain via `winget` and add it to your active terminal `PATH`:

```powershell
winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT --accept-source-agreements --accept-package-agreements
$mingwBin = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages" | Get-ChildItem -Directory -Filter "BrechtSanders.WinLibs.POSIX.UCRT*" | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "mingw64\bin" }
if ($mingwBin -and (Test-Path $mingwBin)) { $env:Path = "$mingwBin;$env:Path" } else { $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") }
g++ --version
windres --version
```

---

## Copy-Paste Section 2: Build Standalone `GlassPane.exe` (PowerShell / Windows Terminal)

From the root folder of this repository (the folder containing the **`Source`** directory), paste the following block into **PowerShell** or **Windows Terminal** to compile the icon resource and statically link **`GlassPane.exe`** as a single standalone file with zero external DLL dependencies:

```powershell
windres Source/GlassPane.rc -O coff -o Source/GlassPane.res
g++ -O2 -municode -mwindows -static -static-libgcc -static-libstdc++ Source/GlassPane.cpp Source/GlassPane.res -o GlassPane.exe -luser32 -lshell32 -ldwmapi -lgdi32 -lcomctl32 -lgdiplus
Remove-Item Source/GlassPane.res -ErrorAction SilentlyContinue
Write-Host "Built standalone executable: $(Resolve-Path .\GlassPane.exe)" -ForegroundColor Green
```

---

## Step-by-Step Build & Run Instructions

1. **Download / Extract the Project & Point PowerShell to the Folder**:
   First, make sure the project files (specifically the `Source` folder containing `GlassPane.cpp`, `GlassPane.rc`, and `GlassPane.ico`) are saved on your Windows PC (for example, by downloading and extracting the project ZIP from AI Studio to `C:\Users\YourName\Downloads\GlassPane`).
   - **Option A (Easiest — From File Explorer)**: Open the extracted project folder in Windows File Explorer (where you can see the **`Source`** folder), right-click in an empty space inside the folder, and click **"Open in Terminal"** (or click the File Explorer address bar, type `powershell`, and press **Enter**).
   - **Option B (Using `cd` in PowerShell)**: If you already have PowerShell open (after running Section 1), point it to the folder using the `cd` command with the path to your extracted folder:
     ```powershell
     cd "$HOME\Downloads\GlassPane"
     ```
     *(Replace the path in quotes with the actual folder where you extracted or saved the `Source` directory. You can verify you are in the right place by running `dir Source` — you should see `GlassPane.cpp`, `GlassPane.ico`, and `GlassPane.rc`.)*

2. **Install the Compiler Dependencies**:
   Copy and paste the commands from **Copy-Paste Section 1** above into your terminal and press **Enter**. Wait for `winget` to finish installing MinGW-w64 and verify that `g++ --version` and `windres --version` output version information.

3. **Compile the Standalone Executable**:
   Copy and paste the commands from **Copy-Paste Section 2** into that same PowerShell window and press **Enter**.
   - `windres` compiles `Source/GlassPane.rc` and `Source/GlassPane.ico` into a temporary binary resource (`Source/GlassPane.res`).
   - `g++` compiles `Source/GlassPane.cpp` with `-static -static-libgcc -static-libstdc++` and links the resource into **`GlassPane.exe`**.

4. **Where `GlassPane.exe` Gets Built & How to Run It**:
   - **Output Location**: `GlassPane.exe` is created **directly inside your current project root folder** (the exact same folder that contains the `Source` subfolder — e.g., `C:\Users\YourName\Downloads\GlassPane\GlassPane.exe`). The last line of Section 2 also prints its exact full file path in green (`Built standalone executable: C:\...\GlassPane.exe`).
   - **Run It**: Run `.\GlassPane.exe` directly in PowerShell, or run `explorer .` in PowerShell to open the current folder in File Explorer and double-click **`GlassPane.exe`**. Because it is statically linked, you can also move or copy `GlassPane.exe` to your Desktop or anywhere else on your PC.

