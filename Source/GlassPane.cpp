// GlassPane.cpp — Standalone Windows 11 Window Opacity Controller (Custom GDI+ Dark UI)
//
// Uses native Win32, DWM, and GDI+ APIs (SetLayeredWindowAttributes + DWMWA_CLOAKED + Gdiplus)
// to render the modern dark/light card interface with real extracted .exe icons, per-app brand
// color gradients (with Gold Gradient fallback), and inline tick-marked opacity sliders.
//
// Build Standalone Executable (PowerShell / Windows Terminal with MinGW-w64):
//   windres Source/GlassPane.rc -O coff -o Source/GlassPane.res
//   g++ -O2 -municode -mwindows -static -static-libgcc -static-libstdc++ Source/GlassPane.cpp Source/GlassPane.res -o GlassPane.exe -luser32 -lshell32 -ldwmapi -lgdi32 -lcomctl32 -lgdiplus

#include <windows.h>
#include <windowsx.h>
#include <shellapi.h>
#include <dwmapi.h>
#include <commctrl.h>
#include <objidl.h>
#include <gdiplus.h>
#include <vector>
#include <unordered_map>
#include <string>
#include <algorithm>
#include <cwctype>

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "comctl32.lib")
#pragma comment(lib, "gdiplus.lib")

#ifndef DWMWA_CLOAKED
#define DWMWA_CLOAKED 14
#endif
#ifndef DWMWA_USE_IMMERSIVE_DARK_MODE
#define DWMWA_USE_IMMERSIVE_DARK_MODE 20
#endif
#ifndef DWMWA_WINDOW_CORNER_PREFERENCE
#define DWMWA_WINDOW_CORNER_PREFERENCE 33
#endif
#ifndef DWMWA_SYSTEMBACKDROP_TYPE
#define DWMWA_SYSTEMBACKDROP_TYPE 38
#endif

constexpr UINT IDI_GLASSPANE_ICON  = 101;

constexpr UINT WM_TRAYICON         = WM_APP + 1;
constexpr UINT ID_TRAY_OPEN        = 1001;
constexpr UINT ID_TRAY_TOGGLE_ALL  = 1002;
constexpr UINT ID_TRAY_RESTORE_ALL = 1003;
constexpr UINT ID_TRAY_EXIT        = 1004;
constexpr UINT ID_TIMER_ENUM       = 3001;

constexpr int MIN_OPACITY_PCT      = 10;
constexpr int MAX_OPACITY_PCT      = 100;

constexpr int CLIENT_WIDTH         = 540;
constexpr int CLIENT_HEIGHT        = 540;

// Layout geometry constants matching GlassPaneUtilityWindow.tsx
constexpr int OUTER_PAD_X          = 16;
constexpr int TOP_BAR_HEIGHT       = 48;
constexpr int CONTAINER_TOP        = 48;
constexpr int CONTAINER_BOTTOM_PAD = 16;
constexpr int CONTAINER_PAD        = 12;
constexpr int CARD_HEIGHT          = 66;
constexpr int CARD_GAP             = 10;
constexpr int SLIDER_WIDTH         = 210;
constexpr int SLIDER_RIGHT_PAD     = 18;

static int ClampInt(int val, int lo, int hi) {
    if (val < lo) return lo;
    if (val > hi) return hi;
    return val;
}

static float ClampFloat(float val, float lo, float hi) {
    if (val < lo) return lo;
    if (val > hi) return hi;
    return val;
}

struct BrandColorPalette {
    Gdiplus::Color darkBgStart;
    Gdiplus::Color darkBgEnd;
    Gdiplus::Color darkBorder;
    Gdiplus::Color lightBgStart;
    Gdiplus::Color lightBgEnd;
    Gdiplus::Color lightBorder;
    Gdiplus::Color sliderTrack;
    Gdiplus::Color sliderUnfilled;
    Gdiplus::Color thumbFill;
    Gdiplus::Color thumbRing;
};

// Default Gold Gradient for any application without a specific brand color scheme
static const BrandColorPalette GOLD_GRADIENT_PALETTE = {
    Gdiplus::Color(235, 118, 83, 14),
    Gdiplus::Color(245, 78, 53, 9),
    Gdiplus::Color(255, 234, 179, 8),
    Gdiplus::Color(245, 254, 249, 195),
    Gdiplus::Color(240, 253, 224, 71),
    Gdiplus::Color(255, 202, 138, 4),
    Gdiplus::Color(255, 250, 204, 21),
    Gdiplus::Color(85, 250, 204, 21),
    Gdiplus::Color(255, 253, 224, 71),
    Gdiplus::Color(115, 234, 179, 8)
};

static const BrandColorPalette DISCORD_PALETTE = {
    Gdiplus::Color(230, 46, 50, 92),
    Gdiplus::Color(240, 38, 41, 74),
    Gdiplus::Color(255, 88, 101, 242),
    Gdiplus::Color(242, 224, 231, 255),
    Gdiplus::Color(242, 199, 210, 254),
    Gdiplus::Color(255, 79, 70, 229),
    Gdiplus::Color(255, 109, 120, 247),
    Gdiplus::Color(85, 129, 140, 248),
    Gdiplus::Color(255, 124, 134, 249),
    Gdiplus::Color(115, 88, 101, 242)
};

static const BrandColorPalette FIREFOX_PALETTE = {
    Gdiplus::Color(232, 84, 53, 20),
    Gdiplus::Color(242, 64, 40, 15),
    Gdiplus::Color(255, 217, 119, 6),
    Gdiplus::Color(242, 254, 243, 199),
    Gdiplus::Color(242, 253, 230, 138),
    Gdiplus::Color(255, 217, 119, 6),
    Gdiplus::Color(255, 245, 158, 11),
    Gdiplus::Color(85, 245, 158, 11),
    Gdiplus::Color(255, 251, 191, 36),
    Gdiplus::Color(115, 217, 119, 6)
};

static const BrandColorPalette SPOTIFY_PALETTE = {
    Gdiplus::Color(232, 26, 68, 45),
    Gdiplus::Color(242, 20, 53, 35),
    Gdiplus::Color(255, 29, 185, 84),
    Gdiplus::Color(242, 220, 252, 231),
    Gdiplus::Color(242, 187, 247, 208),
    Gdiplus::Color(255, 22, 163, 74),
    Gdiplus::Color(255, 34, 197, 94),
    Gdiplus::Color(85, 34, 197, 94),
    Gdiplus::Color(255, 34, 197, 94),
    Gdiplus::Color(115, 29, 185, 84)
};

static const BrandColorPalette CHROME_PALETTE = {
    Gdiplus::Color(232, 30, 52, 78),
    Gdiplus::Color(242, 23, 40, 62),
    Gdiplus::Color(255, 59, 130, 246),
    Gdiplus::Color(242, 219, 234, 254),
    Gdiplus::Color(242, 191, 219, 254),
    Gdiplus::Color(255, 37, 99, 235),
    Gdiplus::Color(255, 59, 130, 246),
    Gdiplus::Color(85, 59, 130, 246),
    Gdiplus::Color(255, 96, 165, 250),
    Gdiplus::Color(115, 59, 130, 246)
};

static const BrandColorPalette SYSTEM_SKY_PALETTE = {
    Gdiplus::Color(232, 42, 54, 68),
    Gdiplus::Color(242, 33, 42, 54),
    Gdiplus::Color(255, 56, 189, 248),
    Gdiplus::Color(242, 224, 242, 254),
    Gdiplus::Color(242, 186, 230, 253),
    Gdiplus::Color(255, 2, 132, 199),
    Gdiplus::Color(255, 56, 189, 248),
    Gdiplus::Color(85, 56, 189, 248),
    Gdiplus::Color(255, 125, 211, 252),
    Gdiplus::Color(115, 56, 189, 248)
};

static const BrandColorPalette STEAM_PALETTE = {
    Gdiplus::Color(235, 27, 45, 72),
    Gdiplus::Color(245, 21, 35, 56),
    Gdiplus::Color(255, 59, 110, 156),
    Gdiplus::Color(242, 226, 232, 240),
    Gdiplus::Color(242, 203, 213, 225),
    Gdiplus::Color(255, 51, 65, 85),
    Gdiplus::Color(255, 56, 118, 168),
    Gdiplus::Color(90, 56, 118, 168),
    Gdiplus::Color(255, 82, 148, 201),
    Gdiplus::Color(115, 59, 110, 156)
};

struct WindowOpacityState {
    int percent = 75;       // 10% .. 100%
    bool isActive = false;  // Independent ON/OFF state per window (starts OFF / grayscale until clicked or dragged)
};

struct OpenWindowEntry {
    HWND hwnd = nullptr;
    std::wstring windowTitle;
    std::wstring appName;
    std::wstring exeName;
    BrandColorPalette palette = GOLD_GRADIENT_PALETTE;
    Gdiplus::Bitmap* iconBitmap = nullptr;
};

static ULONG_PTR g_gdiplusToken  = 0;
static NOTIFYICONDATAW g_nid     = {};
static HWND g_hMainWnd           = nullptr;
static HICON g_hAppIcon          = nullptr;

static bool g_globalMasterOn     = true;
static bool g_isLightTheme       = false;
static std::vector<OpenWindowEntry> g_openWindows;
static std::unordered_map<HWND, WindowOpacityState> g_windowStates;
static std::unordered_map<HWND, Gdiplus::Bitmap*> g_iconCache;

// Scroll and interaction states
static int g_scrollOffsetPx      = 0;
static int g_maxScrollPx         = 0;
static HWND g_draggingSliderHwnd = nullptr;
static bool g_isDraggingScrollbar = false;
static int g_scrollbarDragStartY = 0;
static int g_scrollbarStartOffset = 0;

static std::wstring ToLowerW(const std::wstring& str) {
    std::wstring out = str;
    for (wchar_t& c : out) {
        c = static_cast<wchar_t>( std::towlower(c) );
    }
    return out;
}

static bool ContainsInsensitive(const std::wstring& haystack, const wchar_t* needle) {
    return ToLowerW(haystack).find(ToLowerW(needle)) != std::wstring::npos;
}

// Extracts the executable filename (e.g. "Discord.exe") for a given HWND
static std::wstring GetProcessExeName(HWND hwnd, std::wstring* outFullPath = nullptr) {
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (!pid) return L"";

    HANDLE hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
    if (!hProc) return L"";

    wchar_t pathBuf[MAX_PATH] = {};
    DWORD sz = MAX_PATH;
    std::wstring result;
    if (QueryFullProcessImageNameW(hProc, 0, pathBuf, &sz)) {
        std::wstring full(pathBuf, sz);
        if (outFullPath) *outFullPath = full;
        size_t slash = full.find_last_of(L"\\/");
        result = (slash != std::wstring::npos) ? full.substr(slash + 1) : full;
    }
    CloseHandle(hProc);
    return result;
}

// Resolves a clean application display name and BrandColorPalette
static void ResolveAppIdentity(const std::wstring& exeName, const std::wstring& windowTitle,
                               std::wstring& outAppName, BrandColorPalette& outPalette) {
    if (ContainsInsensitive(exeName, L"discord") || ContainsInsensitive(windowTitle, L"Discord")) {
        outAppName = L"Discord";
        outPalette = DISCORD_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"firefox") || ContainsInsensitive(windowTitle, L"Firefox")) {
        outAppName = L"Firefox";
        outPalette = FIREFOX_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"spotify") || ContainsInsensitive(windowTitle, L"Spotify")) {
        outAppName = L"Spotify";
        outPalette = SPOTIFY_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"chrome") || ContainsInsensitive(windowTitle, L"Google Chrome")) {
        outAppName = L"Google Chrome";
        outPalette = CHROME_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"msedge") || ContainsInsensitive(windowTitle, L"Edge")) {
        outAppName = L"Microsoft Edge";
        outPalette = SYSTEM_SKY_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"steam") || ContainsInsensitive(windowTitle, L"Steam")) {
        outAppName = L"Steam";
        outPalette = STEAM_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"explorer") || ContainsInsensitive(windowTitle, L"File Explorer")) {
        outAppName = L"File Explorer";
        outPalette = SYSTEM_SKY_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"systemsettings") || ContainsInsensitive(windowTitle, L"Settings")) {
        outAppName = L"System Settings";
        outPalette = SYSTEM_SKY_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"powershell") || ContainsInsensitive(exeName, L"pwsh") ||
        ContainsInsensitive(windowTitle, L"PowerShell")) {
        outAppName = L"Windows PowerShell";
        outPalette = CHROME_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"windowsterminal") || ContainsInsensitive(windowTitle, L"Terminal")) {
        outAppName = L"Windows Terminal";
        outPalette = GOLD_GRADIENT_PALETTE;
        return;
    }
    if (ContainsInsensitive(exeName, L"notepad") || ContainsInsensitive(windowTitle, L"Notepad")) {
        outAppName = L"Notepad";
        outPalette = GOLD_GRADIENT_PALETTE;
        return;
    }

    // Derive friendly name from window title suffix ("Document - AppName") or exeName
    outPalette = GOLD_GRADIENT_PALETTE;
    size_t dashPos = windowTitle.rfind(L" - ");
    if (dashPos != std::wstring::npos && dashPos + 3 < windowTitle.size()) {
        outAppName = windowTitle.substr(dashPos + 3);
    } else if (!exeName.empty()) {
        size_t dot = exeName.find_last_of(L'.');
        outAppName = (dot != std::wstring::npos) ? exeName.substr(0, dot) : exeName;
        if (!outAppName.empty()) {
            outAppName[0] = static_cast<wchar_t>(std::towupper(outAppName[0]));
        }
    } else {
        outAppName = windowTitle;
    }
}

// Renders an HICON into a 32x32 32-bit ARGB Gdiplus::Bitmap preserving per-pixel alpha
static Gdiplus::Bitmap* ConvertHIconToBitmap(HICON hIcon) {
    if (!hIcon) return nullptr;

    constexpr int ICON_SZ = 32;
    BITMAPV5HEADER bi = {};
    bi.bV5Size        = sizeof(BITMAPV5HEADER);
    bi.bV5Width       = ICON_SZ;
    bi.bV5Height      = -ICON_SZ; // Top-down DIB
    bi.bV5Planes      = 1;
    bi.bV5BitCount    = 32;
    bi.bV5Compression = BI_BITFIELDS;
    bi.bV5RedMask     = 0x00FF0000;
    bi.bV5GreenMask   = 0x0000FF00;
    bi.bV5BlueMask    = 0x000000FF;
    bi.bV5AlphaMask   = 0xFF000000;

    HDC hdcScreen = GetDC(nullptr);
    HDC hdcMem = CreateCompatibleDC(hdcScreen);
    void* lpBits = nullptr;
    HBITMAP hDib = CreateDIBSection(hdcMem, reinterpret_cast<BITMAPINFO*>(&bi), DIB_RGB_COLORS, &lpBits, nullptr, 0);

    Gdiplus::Bitmap* resultBmp = nullptr;
    if (hDib && lpBits) {
        HGDIOBJ hOld = SelectObject(hdcMem, hDib);
        memset(lpBits, 0, ICON_SZ * ICON_SZ * 4);
        DrawIconEx(hdcMem, 0, 0, hIcon, ICON_SZ, ICON_SZ, 0, nullptr, DI_NORMAL);
        SelectObject(hdcMem, hOld);

        // Check if DrawIconEx wrote non-zero alpha values; if a legacy GDI icon zeroed alpha, restore opaque alpha on non-black pixels
        DWORD* pixels = static_cast<DWORD*>(lpBits);
        bool hasAlpha = false;
        for (int i = 0; i < ICON_SZ * ICON_SZ; ++i) {
            if ((pixels[i] & 0xFF000000) != 0) {
                hasAlpha = true;
                break;
            }
        }

        resultBmp = new Gdiplus::Bitmap(ICON_SZ, ICON_SZ, PixelFormat32bppPARGB);
        Gdiplus::BitmapData bmpData = {};
        Gdiplus::Rect rect(0, 0, ICON_SZ, ICON_SZ);
        if (resultBmp->LockBits(&rect, Gdiplus::ImageLockModeWrite, PixelFormat32bppARGB, &bmpData) == Gdiplus::Ok) {
            for (int y = 0; y < ICON_SZ; ++y) {
                DWORD* dstRow = reinterpret_cast<DWORD*>(static_cast<BYTE*>(bmpData.Scan0) + y * bmpData.Stride);
                DWORD* srcRow = pixels + y * ICON_SZ;
                for (int x = 0; x < ICON_SZ; ++x) {
                    DWORD px = srcRow[x];
                    if (!hasAlpha && (px & 0x00FFFFFF) != 0) {
                        px |= 0xFF000000;
                    }
                    dstRow[x] = px;
                }
            }
            resultBmp->UnlockBits(&bmpData);
        }
    }

    if (hDib) DeleteObject(hDib);
    DeleteDC(hdcMem);
    ReleaseDC(nullptr, hdcScreen);
    return resultBmp;
}

// Retrieves or caches the 32x32 ARGB icon bitmap for an application window
static Gdiplus::Bitmap* GetOrExtractWindowIcon(HWND hwnd, const std::wstring& fullExePath) {
    auto it = g_iconCache.find(hwnd);
    if (it != g_iconCache.end() && it->second != nullptr) {
        return it->second;
    }

    HICON hIcon = nullptr;
    bool destroyIconAfter = false;

    // 1. Try WM_GETICON (ICON_BIG then ICON_SMALL2)
    SendMessageTimeoutW(hwnd, WM_GETICON, ICON_BIG, 0, SMTO_ABORTIFHUNG | SMTO_BLOCK, 80, reinterpret_cast<PDWORD_PTR>(&hIcon));
    if (!hIcon) {
        SendMessageTimeoutW(hwnd, WM_GETICON, 2 /*ICON_SMALL2*/, 0, SMTO_ABORTIFHUNG | SMTO_BLOCK, 80, reinterpret_cast<PDWORD_PTR>(&hIcon));
    }
    // 2. Try Window Class Icon
    if (!hIcon) {
        hIcon = reinterpret_cast<HICON>(GetClassLongPtrW(hwnd, GCLP_HICON));
    }
    if (!hIcon) {
        hIcon = reinterpret_cast<HICON>(GetClassLongPtrW(hwnd, GCLP_HICONSM));
    }
    // 3. Try SHGetFileInfoW on the owning process executable path
    if (!hIcon && !fullExePath.empty()) {
        SHFILEINFOW sfi = {};
        if (SHGetFileInfoW(fullExePath.c_str(), 0, &sfi, sizeof(sfi), SHGFI_ICON | SHGFI_LARGEICON)) {
            hIcon = sfi.hIcon;
            destroyIconAfter = true;
        }
    }
    if (!hIcon) {
        hIcon = LoadIconW(nullptr, IDI_APPLICATION);
    }

    Gdiplus::Bitmap* bmp = ConvertHIconToBitmap(hIcon);
    if (destroyIconAfter && hIcon) {
        DestroyIcon(hIcon);
    }

    g_iconCache[hwnd] = bmp;
    return bmp;
}

// Returns true ONLY for visible, user-facing desktop application windows
static bool IsUserApplicationWindow(HWND hwnd) {
    if (!IsWindowVisible(hwnd)) return false;
    if (hwnd == g_hMainWnd) return false;

    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    if (exStyle & WS_EX_TOOLWINDOW) return false;

    INT cloaked = 0;
    if (SUCCEEDED(DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked, sizeof(cloaked))) && cloaked != 0) {
        return false;
    }

    int len = GetWindowTextLengthW(hwnd);
    if (len <= 0) return false;

    HWND owner = GetWindow(hwnd, GW_OWNER);
    if (owner != nullptr && !(exStyle & WS_EX_APPWINDOW)) return false;

    wchar_t className[128] = {};
    GetClassNameW(hwnd, className, 127);
    if (wcscmp(className, L"Progman") == 0 ||
        wcscmp(className, L"WorkerW") == 0 ||
        wcscmp(className, L"Shell_TrayWnd") == 0 ||
        wcscmp(className, L"Shell_SecondaryTrayWnd") == 0) {
        return false;
    }

    return true;
}

static void ApplyEffectiveWindowOpacity(HWND hwnd) {
    if (!IsWindow(hwnd)) return;

    auto it = g_windowStates.find(hwnd);
    bool shouldApply = g_globalMasterOn && (it != g_windowStates.end()) && it->second.isActive && (it->second.percent < 100);

    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    if (!shouldApply) {
        if (exStyle & WS_EX_LAYERED) {
            SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA);
        }
    } else {
        int pct = ClampInt(it->second.percent, MIN_OPACITY_PCT, MAX_OPACITY_PCT);
        BYTE alpha = static_cast<BYTE>((pct * 255) / 100);

        if (!(exStyle & WS_EX_LAYERED)) {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle | WS_EX_LAYERED);
        }
        SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
    }
}

static void ApplyAllTrackedWindows() {
    for (auto& kv : g_windowStates) {
        if (IsWindow(kv.first)) {
            ApplyEffectiveWindowOpacity(kv.first);
        }
    }
}

static void RestoreAllWindowsOnExit() {
    for (auto& kv : g_windowStates) {
        if (IsWindow(kv.first)) {
            LONG_PTR exStyle = GetWindowLongPtrW(kv.first, GWL_EXSTYLE);
            if (exStyle & WS_EX_LAYERED) {
                SetLayeredWindowAttributes(kv.first, 0, 255, LWA_ALPHA);
            }
        }
    }
}

static BOOL CALLBACK EnumWindowsCallback(HWND hwnd, LPARAM) {
    if (!IsUserApplicationWindow(hwnd)) return TRUE;

    wchar_t titleBuf[256] = {};
    GetWindowTextW(hwnd, titleBuf, 255);
    std::wstring winTitle(titleBuf);

    std::wstring fullExePath;
    std::wstring exeName = GetProcessExeName(hwnd, &fullExePath);

    OpenWindowEntry entry;
    entry.hwnd = hwnd;
    entry.windowTitle = winTitle;
    entry.exeName = exeName;
    ResolveAppIdentity(exeName, winTitle, entry.appName, entry.palette);
    entry.iconBitmap = GetOrExtractWindowIcon(hwnd, fullExePath);

    g_openWindows.push_back(entry);

    if (g_windowStates.find(hwnd) == g_windowStates.end()) {
        // Check if window already has layered alpha set externally
        WindowOpacityState initial = { 75, false };
        LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        if (exStyle & WS_EX_LAYERED) {
            BYTE curAlpha = 255;
            DWORD flags = 0;
            if (GetLayeredWindowAttributes(hwnd, nullptr, &curAlpha, &flags) && (flags & LWA_ALPHA) && curAlpha < 252) {
                initial.percent = ClampInt((curAlpha * 100) / 255, MIN_OPACITY_PCT, MAX_OPACITY_PCT);
                initial.isActive = true;
            }
        }
        g_windowStates[hwnd] = initial;
    }

    return TRUE;
}

static void UpdateScrollBounds(int clientH) {
    int viewportH = clientH - CONTAINER_TOP - CONTAINER_BOTTOM_PAD - (CONTAINER_PAD * 2);
    int totalContentH = 0;
    if (!g_openWindows.empty()) {
        totalContentH = static_cast<int>(g_openWindows.size()) * CARD_HEIGHT +
                        (static_cast<int>(g_openWindows.size()) - 1) * CARD_GAP;
    }
    g_maxScrollPx = (totalContentH > viewportH) ? (totalContentH - viewportH) : 0;
    g_scrollOffsetPx = ClampInt(g_scrollOffsetPx, 0, g_maxScrollPx);
}

static void RefreshOpenWindowsList() {
    g_openWindows.clear();
    EnumWindows(EnumWindowsCallback, 0);

    RECT rc = {};
    GetClientRect(g_hMainWnd, &rc);
    UpdateScrollBounds(rc.bottom - rc.top);
    InvalidateRect(g_hMainWnd, nullptr, FALSE);
}

static void ApplyWindowThemeAttributes(HWND hwnd) {
    INT cornerPref = 2; // DWMWCP_ROUND
    DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, &cornerPref, sizeof(cornerPref));
    BOOL darkMode = g_isLightTheme ? FALSE : TRUE;
    DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, &darkMode, sizeof(darkMode));
    INT backdropType = 2; // DWMSBT_MAINWINDOW (Mica)
    DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, &backdropType, sizeof(backdropType));
}

// Helper to build a GDI+ rounded rectangle path
static void AddRoundedRectPath(Gdiplus::GraphicsPath& path, Gdiplus::RectF r, float radius) {
    if (radius <= 0.5f) {
        path.AddRectangle(r);
        return;
    }
    float d = radius * 2.0f;
    if (d > r.Width) d = r.Width;
    if (d > r.Height) d = r.Height;

    path.AddArc(r.X, r.Y, d, d, 180.0f, 90.0f);
    path.AddArc(r.X + r.Width - d, r.Y, d, d, 270.0f, 90.0f);
    path.AddArc(r.X + r.Width - d, r.Y + r.Height - d, d, d, 0.0f, 90.0f);
    path.AddArc(r.X, r.Y + r.Height - d, d, d, 90.0f, 90.0f);
    path.CloseFigure();
}

static float GetTrackPositionRatio(int pct) {
    int clamped = ClampInt(pct, MIN_OPACITY_PCT, MAX_OPACITY_PCT);
    return static_cast<float>(clamped - MIN_OPACITY_PCT) / static_cast<float>(MAX_OPACITY_PCT - MIN_OPACITY_PCT);
}

static int GetPercentFromTrackX(float clickX, float trackLeft, float trackWidth) {
    float ratio = ClampFloat((clickX - trackLeft) / trackWidth, 0.0f, 1.0f);
    int pct = static_cast<int>(MIN_OPACITY_PCT + ratio * (MAX_OPACITY_PCT - MIN_OPACITY_PCT) + 0.5f);
    return ClampInt(pct, MIN_OPACITY_PCT, MAX_OPACITY_PCT);
}

// Custom GDI+ paint routine matching GlassPaneUtilityWindow.tsx
static void PaintGlassPaneCanvas(HDC hdc, int width, int height) {
    Gdiplus::Graphics g(hdc);
    g.SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);
    g.SetTextRenderingHint(Gdiplus::TextRenderingHintClearTypeGridFit);
    g.SetInterpolationMode(Gdiplus::InterpolationModeHighQualityBicubic);

    // 1. Window Canvas Background
    Gdiplus::Color canvasBg = g_isLightTheme
        ? Gdiplus::Color(255, 241, 245, 249)  // slate-100
        : Gdiplus::Color(255, 27, 29, 34);    // #1b1d22
    g.Clear(canvasBg);

    Gdiplus::FontFamily segoeFamily(L"Segoe UI");
    Gdiplus::FontFamily monoFamily(L"Consolas");
    Gdiplus::Font fontLabel(&segoeFamily, 13.0f, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);
    Gdiplus::Font fontAppName(&segoeFamily, 14.5f, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);
    Gdiplus::Font fontSubtitle(&segoeFamily, 11.5f, Gdiplus::FontStyleRegular, Gdiplus::UnitPixel);
    Gdiplus::Font fontMono(&monoFamily, 11.0f, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);

    // 2. Top Row: Theme Toggle Button (left) + Master ON/OFF Pill Switch (right)
    Gdiplus::RectF themeBtnRect(16.0f, 10.0f, 92.0f, 28.0f);
    {
        Gdiplus::GraphicsPath themePath;
        AddRoundedRectPath(themePath, themeBtnRect, 6.0f);
        Gdiplus::SolidBrush themeBg(g_isLightTheme ? Gdiplus::Color(255, 226, 232, 240) : Gdiplus::Color(255, 38, 41, 49));
        Gdiplus::Pen themeBorder(g_isLightTheme ? Gdiplus::Color(255, 203, 213, 225) : Gdiplus::Color(255, 52, 56, 66), 1.0f);
        g.FillPath(&themeBg, &themePath);
        g.DrawPath(&themeBorder, &themePath);

        Gdiplus::SolidBrush themeTextBrush(g_isLightTheme ? Gdiplus::Color(255, 51, 65, 85) : Gdiplus::Color(255, 203, 213, 225));
        Gdiplus::StringFormat sfCenter;
        sfCenter.SetAlignment(Gdiplus::StringAlignmentCenter);
        sfCenter.SetLineAlignment(Gdiplus::StringAlignmentCenter);
        const wchar_t* themeLabel = g_isLightTheme ? L"\x263E Dark UI" : L"\x2600 Light UI";
        g.DrawString(themeLabel, -1, &fontSubtitle, themeBtnRect, &sfCenter, &themeTextBrush);
    }

    // Master ON/OFF Switch at top-right
    float switchW = 48.0f;
    float switchH = 24.0f;
    float switchX = static_cast<float>(width - OUTER_PAD_X - 8) - switchW;
    float switchY = 12.0f;
    Gdiplus::RectF masterSwitchRect(switchX, switchY, switchW, switchH);
    {
        Gdiplus::SolidBrush onOffTextBrush(g_isLightTheme ? Gdiplus::Color(255, 30, 41, 59) : Gdiplus::Color(255, 241, 245, 249));
        Gdiplus::StringFormat sfRight;
        sfRight.SetAlignment(Gdiplus::StringAlignmentFar);
        sfRight.SetLineAlignment(Gdiplus::StringAlignmentCenter);
        Gdiplus::RectF labelRect(switchX - 56.0f, switchY, 46.0f, switchH);
        g.DrawString(g_globalMasterOn ? L"ON" : L"OFF", -1, &fontLabel, labelRect, &sfRight, &onOffTextBrush);

        Gdiplus::GraphicsPath pillPath;
        AddRoundedRectPath(pillPath, masterSwitchRect, switchH * 0.5f);
        Gdiplus::Color pillColor = g_globalMasterOn
            ? Gdiplus::Color(255, 56, 152, 255) // #3898ff
            : (g_isLightTheme ? Gdiplus::Color(255, 203, 213, 225) : Gdiplus::Color(255, 50, 54, 64));
        Gdiplus::SolidBrush pillBrush(pillColor);
        g.FillPath(&pillBrush, &pillPath);

        float knobSize = 16.0f;
        float knobY = switchY + (switchH - knobSize) * 0.5f;
        float knobX = g_globalMasterOn ? (switchX + switchW - knobSize - 4.0f) : (switchX + 4.0f);
        Gdiplus::Color knobColor = g_globalMasterOn
            ? Gdiplus::Color(255, 24, 32, 44)   // #18202c
            : Gdiplus::Color(255, 148, 163, 184);
        Gdiplus::SolidBrush knobBrush(knobColor);
        g.FillEllipse(&knobBrush, knobX, knobY, knobSize, knobSize);
    }

    // 3. Inner Rounded Container holding the Dynamic Open Application List + Right Scrollbar
    float contX = static_cast<float>(OUTER_PAD_X);
    float contY = static_cast<float>(CONTAINER_TOP);
    float contW = static_cast<float>(width - OUTER_PAD_X * 2);
    float contH = static_cast<float>(height - CONTAINER_TOP - CONTAINER_BOTTOM_PAD);
    Gdiplus::RectF containerRect(contX, contY, contW, contH);
    {
        Gdiplus::GraphicsPath contPath;
        AddRoundedRectPath(contPath, containerRect, 12.0f);
        Gdiplus::SolidBrush contFill(g_isLightTheme
            ? Gdiplus::Color(255, 226, 232, 240)
            : Gdiplus::Color(255, 32, 34, 40)); // #202228
        Gdiplus::Pen contPen(g_isLightTheme
            ? Gdiplus::Color(255, 203, 213, 225)
            : Gdiplus::Color(255, 46, 50, 59), 1.0f); // #2e323b
        g.FillPath(&contFill, &contPath);
        g.DrawPath(&contPen, &contPath);
    }

    // 4. Scrollable Viewport Area for Open Application Cards
    bool hasScrollbar = (g_maxScrollPx > 0);
    float rightReserve = hasScrollbar ? 20.0f : static_cast<float>(CONTAINER_PAD);
    Gdiplus::RectF viewportRect(
        contX + CONTAINER_PAD,
        contY + CONTAINER_PAD,
        contW - CONTAINER_PAD - rightReserve,
        contH - CONTAINER_PAD * 2
    );

    g.SetClip(viewportRect);

    if (g_openWindows.empty()) {
        Gdiplus::SolidBrush emptyBrush(Gdiplus::Color(255, 148, 163, 184));
        Gdiplus::StringFormat sfEmpty;
        sfEmpty.SetAlignment(Gdiplus::StringAlignmentCenter);
        sfEmpty.SetLineAlignment(Gdiplus::StringAlignmentCenter);
        g.DrawString(L"No open desktop application windows detected.", -1, &fontLabel, viewportRect, &sfEmpty, &emptyBrush);
    } else {
        // Grayscale ColorMatrix for inactive application icons
        Gdiplus::ColorMatrix grayMatrix = { {
            { 0.30f, 0.30f, 0.30f, 0.0f, 0.0f },
            { 0.59f, 0.59f, 0.59f, 0.0f, 0.0f },
            { 0.11f, 0.11f, 0.11f, 0.0f, 0.0f },
            { 0.0f,  0.0f,  0.0f,  0.65f, 0.0f },
            { 0.0f,  0.0f,  0.0f,  0.0f, 1.0f }
        } };
        Gdiplus::ImageAttributes grayAttr;
        grayAttr.SetColorMatrix(&grayMatrix, Gdiplus::ColorMatrixFlagsDefault, Gdiplus::ColorAdjustTypeBitmap);

        for (size_t i = 0; i < g_openWindows.size(); ++i) {
            const auto& win = g_openWindows[i];
            const auto& st = g_windowStates[win.hwnd];
            bool isBarActive = st.isActive && g_globalMasterOn;

            float cardY = viewportRect.Y + static_cast<float>(i * (CARD_HEIGHT + CARD_GAP)) - static_cast<float>(g_scrollOffsetPx);
            if (cardY + CARD_HEIGHT < viewportRect.Y - 4.0f || cardY > viewportRect.Y + viewportRect.Height + 4.0f) {
                continue; // Outside visible scroll viewport
            }

            Gdiplus::RectF cardRect(viewportRect.X, cardY, viewportRect.Width, static_cast<float>(CARD_HEIGHT));
            Gdiplus::GraphicsPath cardPath;
            AddRoundedRectPath(cardPath, cardRect, 8.0f);

            // Card Background Gradient & Border
            Gdiplus::Color cStart, cEnd, cBorder;
            if (isBarActive) {
                cStart  = g_isLightTheme ? win.palette.lightBgStart : win.palette.darkBgStart;
                cEnd    = g_isLightTheme ? win.palette.lightBgEnd   : win.palette.darkBgEnd;
                cBorder = g_isLightTheme ? win.palette.lightBorder  : win.palette.darkBorder;
            } else {
                cStart  = g_isLightTheme ? Gdiplus::Color(255, 248, 250, 252) : Gdiplus::Color(235, 43, 46, 53);
                cEnd    = g_isLightTheme ? Gdiplus::Color(255, 241, 245, 249) : Gdiplus::Color(242, 36, 39, 45);
                cBorder = g_isLightTheme ? Gdiplus::Color(255, 203, 213, 225) : Gdiplus::Color(255, 61, 65, 74);
            }

            Gdiplus::LinearGradientBrush cardGrad(cardRect, cStart, cEnd, Gdiplus::LinearGradientModeForwardDiagonal);
            Gdiplus::Pen cardPen(cBorder, 1.0f);
            g.FillPath(&cardGrad, &cardPath);
            g.DrawPath(&cardPen, &cardPath);

            // Left Side: 32x32 Real Application Icon + App Name & Window Title
            float iconX = cardRect.X + 14.0f;
            float iconY = cardRect.Y + (cardRect.Height - 32.0f) * 0.5f;
            if (win.iconBitmap) {
                Gdiplus::Rect destIconRect(static_cast<int>(iconX), static_cast<int>(iconY), 32, 32);
                if (isBarActive) {
                    g.DrawImage(win.iconBitmap, destIconRect);
                } else {
                    g.DrawImage(win.iconBitmap, destIconRect, 0, 0,
                                static_cast<int>(win.iconBitmap->GetWidth()),
                                static_cast<int>(win.iconBitmap->GetHeight()),
                                Gdiplus::UnitPixel, &grayAttr);
                }
            }

            float textLeft = iconX + 32.0f + 12.0f;
            float sliderLeft = cardRect.X + cardRect.Width - static_cast<float>(SLIDER_WIDTH) - static_cast<float>(SLIDER_RIGHT_PAD);
            float textMaxW = sliderLeft - textLeft - 12.0f;

            Gdiplus::Color titleColor = isBarActive
                ? (g_isLightTheme ? Gdiplus::Color(255, 15, 23, 42) : Gdiplus::Color(255, 255, 255, 255))
                : (g_isLightTheme ? Gdiplus::Color(255, 100, 116, 139) : Gdiplus::Color(255, 148, 163, 184));
            Gdiplus::Color subColor = isBarActive
                ? (g_isLightTheme ? Gdiplus::Color(220, 51, 65, 85) : Gdiplus::Color(200, 226, 232, 240))
                : (g_isLightTheme ? Gdiplus::Color(190, 100, 116, 139) : Gdiplus::Color(175, 100, 116, 139));

            Gdiplus::SolidBrush titleBrush(titleColor);
            Gdiplus::SolidBrush subBrush(subColor);

            Gdiplus::StringFormat sfEllipsis;
            sfEllipsis.SetTrimming(Gdiplus::StringTrimmingEllipsisCharacter);
            sfEllipsis.SetFormatFlags(Gdiplus::StringFormatFlagsNoWrap);
            sfEllipsis.SetLineAlignment(Gdiplus::StringAlignmentCenter);

            if (win.windowTitle != win.appName && !win.windowTitle.empty()) {
                Gdiplus::RectF nameRect(textLeft, cardRect.Y + 12.0f, textMaxW, 22.0f);
                Gdiplus::RectF subRect(textLeft, cardRect.Y + 34.0f, textMaxW, 18.0f);
                g.DrawString(win.appName.c_str(), -1, &fontAppName, nameRect, &sfEllipsis, &titleBrush);
                g.DrawString(win.windowTitle.c_str(), -1, &fontSubtitle, subRect, &sfEllipsis, &subBrush);
            } else {
                Gdiplus::RectF nameRect(textLeft, cardRect.Y, textMaxW, cardRect.Height);
                g.DrawString(win.appName.c_str(), -1, &fontAppName, nameRect, &sfEllipsis, &titleBrush);
            }

            // Right Side: Horizontal Tick-Marked Opacity Slider
            float trackW = static_cast<float>(SLIDER_WIDTH);
            float trackY = cardRect.Y + cardRect.Height * 0.5f + 1.0f;
            float thumbRatio = GetTrackPositionRatio(st.percent);
            float thumbX = sliderLeft + thumbRatio * trackW;

            Gdiplus::Color activeTrackColor = isBarActive
                ? win.palette.sliderTrack
                : (g_isLightTheme ? Gdiplus::Color(255, 100, 116, 139) : Gdiplus::Color(255, 113, 120, 133));
            Gdiplus::Color unfilledTrackColor = isBarActive
                ? win.palette.sliderUnfilled
                : (g_isLightTheme ? Gdiplus::Color(95, 148, 163, 184) : Gdiplus::Color(65, 148, 163, 184));
            Gdiplus::Color thumbFillColor = isBarActive
                ? win.palette.thumbFill
                : (g_isLightTheme ? Gdiplus::Color(255, 100, 116, 139) : Gdiplus::Color(255, 139, 146, 158));
            Gdiplus::Color thumbRingColor = isBarActive
                ? win.palette.thumbRing
                : Gdiplus::Color(65, 148, 163, 184);

            // Unfilled & Active Track
            Gdiplus::Pen unfilledPen(unfilledTrackColor, 3.0f);
            unfilledPen.SetStartCap(Gdiplus::LineCapRound);
            unfilledPen.SetEndCap(Gdiplus::LineCapRound);
            g.DrawLine(&unfilledPen, sliderLeft, trackY, sliderLeft + trackW, trackY);

            if (thumbX > sliderLeft + 1.0f) {
                Gdiplus::Pen activePen(activeTrackColor, 3.0f);
                activePen.SetStartCap(Gdiplus::LineCapRound);
                activePen.SetEndCap(Gdiplus::LineCapRound);
                g.DrawLine(&activePen, sliderLeft, trackY, thumbX, trackY);
            }

            // Vertical Tick Marks at 25%, 50%, 75%, 100%
            const int ticks[] = { 25, 50, 75, 100 };
            for (int t : ticks) {
                float tx = sliderLeft + GetTrackPositionRatio(t) * trackW;
                bool passed = (st.percent >= t);
                Gdiplus::Pen tickPen(passed ? activeTrackColor : unfilledTrackColor, 1.5f);
                g.DrawLine(&tickPen, tx, trackY - 6.5f, tx, trackY + 6.5f);
            }

            // Outer Thumb Ring + Inner Thumb Dot
            Gdiplus::SolidBrush ringBrush(thumbRingColor);
            Gdiplus::SolidBrush dotBrush(thumbFillColor);
            g.FillEllipse(&ringBrush, thumbX - 10.0f, trackY - 10.0f, 20.0f, 20.0f);
            g.FillEllipse(&dotBrush, thumbX - 5.0f, trackY - 5.0f, 10.0f, 10.0f);

            // Top Numbers: Floating Current % above thumb + 100% at right end
            Gdiplus::Color numColor = isBarActive
                ? (g_isLightTheme ? Gdiplus::Color(255, 30, 41, 59) : Gdiplus::Color(255, 226, 232, 240))
                : Gdiplus::Color(255, 148, 163, 184);
            Gdiplus::SolidBrush numBrush(numColor);
            Gdiplus::StringFormat sfNum;
            sfNum.SetAlignment(Gdiplus::StringAlignmentCenter);
            sfNum.SetLineAlignment(Gdiplus::StringAlignmentCenter);

            if (st.percent < 94) {
                wchar_t pctBuf[16] = {};
                wsprintfW(pctBuf, L"%d%%", st.percent);
                Gdiplus::RectF curPctRect(thumbX - 24.0f, cardRect.Y + 6.0f, 48.0f, 16.0f);
                g.DrawString(pctBuf, -1, &fontMono, curPctRect, &sfNum, &numBrush);
            }

            Gdiplus::RectF top100Rect(sliderLeft + trackW - 24.0f, cardRect.Y + 6.0f, 48.0f, 16.0f);
            g.DrawString(L"100%", -1, &fontMono, top100Rect, &sfNum, &numBrush);

            // Bottom Clickable Preset Labels: 25%, 50%, 75%
            const int bottomTicks[] = { 25, 50, 75 };
            for (int t : bottomTicks) {
                float tx = sliderLeft + GetTrackPositionRatio(t) * trackW;
                wchar_t tBuf[16] = {};
                wsprintfW(tBuf, L"%d%%", t);
                Gdiplus::RectF lblRect(tx - 20.0f, trackY + 9.0f, 40.0f, 16.0f);
                g.DrawString(tBuf, -1, &fontMono, lblRect, &sfNum, &numBrush);
            }
        }
    }

    g.ResetClip();

    // 5. Right-Hand Custom Scrollbar Track & Draggable Thumb
    if (hasScrollbar) {
        float sbX = contX + contW - 12.0f;
        float sbY = contY + CONTAINER_PAD;
        float sbW = 6.0f;
        float sbH = contH - CONTAINER_PAD * 2;
        Gdiplus::RectF sbTrackRect(sbX, sbY, sbW, sbH);

        Gdiplus::GraphicsPath sbTrackPath;
        AddRoundedRectPath(sbTrackPath, sbTrackRect, 3.0f);
        Gdiplus::SolidBrush sbTrackBrush(g_isLightTheme ? Gdiplus::Color(200, 203, 213, 225) : Gdiplus::Color(255, 21, 23, 28));
        g.FillPath(&sbTrackBrush, &sbTrackPath);

        float viewportH = viewportRect.Height;
        float totalH = viewportH + static_cast<float>(g_maxScrollPx);
        float thumbH = ClampFloat((viewportH / totalH) * sbH, 36.0f, sbH);
        float scrollRatio = (g_maxScrollPx > 0) ? (static_cast<float>(g_scrollOffsetPx) / static_cast<float>(g_maxScrollPx)) : 0.0f;
        float thumbY = sbY + scrollRatio * (sbH - thumbH);

        Gdiplus::RectF sbThumbRect(sbX, thumbY, sbW, thumbH);
        Gdiplus::GraphicsPath sbThumbPath;
        AddRoundedRectPath(sbThumbPath, sbThumbRect, 3.0f);
        Gdiplus::Color thumbCol = g_isDraggingScrollbar
            ? Gdiplus::Color(255, 56, 189, 248)
            : (g_isLightTheme ? Gdiplus::Color(255, 100, 116, 139) : Gdiplus::Color(255, 75, 82, 98));
        Gdiplus::SolidBrush sbThumbBrush(thumbCol);
        g.FillPath(&sbThumbBrush, &sbThumbPath);
    }
}

static void SetWindowOpacityPercent(HWND targetHwnd, int pct) {
    if (!targetHwnd || !IsWindow(targetHwnd)) return;
    auto& st = g_windowStates[targetHwnd];
    st.percent = ClampInt(pct, MIN_OPACITY_PCT, MAX_OPACITY_PCT);
    st.isActive = true;
    g_globalMasterOn = true;
    ApplyEffectiveWindowOpacity(targetHwnd);
    InvalidateRect(g_hMainWnd, nullptr, FALSE);
}

static void HandleClientMouseDown(HWND hwnd, int mx, int my) {
    RECT rc = {};
    GetClientRect(hwnd, &rc);
    int width = rc.right - rc.left;
    int height = rc.bottom - rc.top;

    // 1. Check Theme Toggle Button (16, 10, 92, 28)
    if (mx >= 16 && mx <= 108 && my >= 10 && my <= 38) {
        g_isLightTheme = !g_isLightTheme;
        ApplyWindowThemeAttributes(hwnd);
        InvalidateRect(hwnd, nullptr, FALSE);
        return;
    }

    // 2. Check Master ON/OFF Pill Switch at top-right
    int switchRight = width - OUTER_PAD_X - 8;
    int switchLeft = switchRight - 104; // Includes "ON"/"OFF" label + pill
    if (mx >= switchLeft && mx <= switchRight && my >= 8 && my <= 40) {
        g_globalMasterOn = !g_globalMasterOn;
        ApplyAllTrackedWindows();
        InvalidateRect(hwnd, nullptr, FALSE);
        return;
    }

    // 3. Check Right-Hand Scrollbar
    float contX = static_cast<float>(OUTER_PAD_X);
    float contY = static_cast<float>(CONTAINER_TOP);
    float contW = static_cast<float>(width - OUTER_PAD_X * 2);
    float contH = static_cast<float>(height - CONTAINER_TOP - CONTAINER_BOTTOM_PAD);

    if (g_maxScrollPx > 0) {
        float sbX = contX + contW - 16.0f;
        float sbY = contY + CONTAINER_PAD;
        float sbH = contH - CONTAINER_PAD * 2;
        if (mx >= sbX && mx <= contX + contW && my >= sbY && my <= sbY + sbH) {
            g_isDraggingScrollbar = true;
            g_scrollbarDragStartY = my;
            g_scrollbarStartOffset = g_scrollOffsetPx;
            SetCapture(hwnd);
            InvalidateRect(hwnd, nullptr, FALSE);
            return;
        }
    }

    // 4. Check Open Application Cards inside Viewport
    bool hasScrollbar = (g_maxScrollPx > 0);
    float rightReserve = hasScrollbar ? 20.0f : static_cast<float>(CONTAINER_PAD);
    float vpX = contX + CONTAINER_PAD;
    float vpY = contY + CONTAINER_PAD;
    float vpW = contW - CONTAINER_PAD - rightReserve;
    float vpH = contH - CONTAINER_PAD * 2;

    if (mx < vpX || mx > vpX + vpW || my < vpY || my > vpY + vpH) {
        return;
    }

    for (size_t i = 0; i < g_openWindows.size(); ++i) {
        const auto& win = g_openWindows[i];
        float cardY = vpY + static_cast<float>(i * (CARD_HEIGHT + CARD_GAP)) - static_cast<float>(g_scrollOffsetPx);
        if (my >= cardY && my <= cardY + CARD_HEIGHT) {
            float sliderLeft = vpX + vpW - static_cast<float>(SLIDER_WIDTH) - static_cast<float>(SLIDER_RIGHT_PAD);
            float trackW = static_cast<float>(SLIDER_WIDTH);

            // Did the user click inside the right-hand slider area?
            if (mx >= sliderLeft - 14.0f) {
                // Check preset label clicks (25%, 50%, 75% at bottom or 100% at top-right)
                float trackY = cardY + CARD_HEIGHT * 0.5f + 1.0f;
                if (my >= trackY + 7.0f) {
                    const int bottomTicks[] = { 25, 50, 75 };
                    for (int t : bottomTicks) {
                        float tx = sliderLeft + GetTrackPositionRatio(t) * trackW;
                        if (mx >= tx - 20.0f && mx <= tx + 20.0f) {
                            SetWindowOpacityPercent(win.hwnd, t);
                            return;
                        }
                    }
                } else if (my <= cardY + 22.0f) {
                    float tx100 = sliderLeft + trackW;
                    if (mx >= tx100 - 24.0f && mx <= tx100 + 24.0f) {
                        SetWindowOpacityPercent(win.hwnd, 100);
                        return;
                    }
                }

                // Start continuous slider drag
                g_draggingSliderHwnd = win.hwnd;
                SetCapture(hwnd);
                int newPct = GetPercentFromTrackX(static_cast<float>(mx), sliderLeft, trackW);
                SetWindowOpacityPercent(win.hwnd, newPct);
                return;
            } else {
                // Clicked the left side (App Icon or Title) -> Toggle ON/OFF independently
                auto& st = g_windowStates[win.hwnd];
                st.isActive = !st.isActive;
                ApplyEffectiveWindowOpacity(win.hwnd);
                InvalidateRect(hwnd, nullptr, FALSE);
                return;
            }
        }
    }
}

static void HandleClientMouseMove(HWND hwnd, int mx, int my) {
    RECT rc = {};
    GetClientRect(hwnd, &rc);
    int width = rc.right - rc.left;
    int height = rc.bottom - rc.top;

    if (g_draggingSliderHwnd) {
        bool hasScrollbar = (g_maxScrollPx > 0);
        float rightReserve = hasScrollbar ? 20.0f : static_cast<float>(CONTAINER_PAD);
        float contX = static_cast<float>(OUTER_PAD_X);
        float contW = static_cast<float>(width - OUTER_PAD_X * 2);
        float vpX = contX + CONTAINER_PAD;
        float vpW = contW - CONTAINER_PAD - rightReserve;
        float sliderLeft = vpX + vpW - static_cast<float>(SLIDER_WIDTH) - static_cast<float>(SLIDER_RIGHT_PAD);
        float trackW = static_cast<float>(SLIDER_WIDTH);

        int newPct = GetPercentFromTrackX(static_cast<float>(mx), sliderLeft, trackW);
        SetWindowOpacityPercent(g_draggingSliderHwnd, newPct);
        return;
    }

    if (g_isDraggingScrollbar && g_maxScrollPx > 0) {
        float contH = static_cast<float>(height - CONTAINER_TOP - CONTAINER_BOTTOM_PAD);
        float sbH = contH - CONTAINER_PAD * 2;
        float viewportH = sbH;
        float totalH = viewportH + static_cast<float>(g_maxScrollPx);
        float thumbH = ClampFloat((viewportH / totalH) * sbH, 36.0f, sbH);
        float scrollableTrack = (sbH - thumbH > 1.0f) ? (sbH - thumbH) : 1.0f;

        int deltaY = my - g_scrollbarDragStartY;
        int scrollDelta = static_cast<int>((static_cast<float>(deltaY) / scrollableTrack) * static_cast<float>(g_maxScrollPx));
        g_scrollOffsetPx = ClampInt(g_scrollbarStartOffset + scrollDelta, 0, g_maxScrollPx);
        InvalidateRect(hwnd, nullptr, FALSE);
    }
}

static void ShowTrayContextMenu(HWND hwnd) {
    POINT pt;
    GetCursorPos(&pt);

    HMENU hMenu = CreatePopupMenu();
    AppendMenuW(hMenu, MF_STRING, ID_TRAY_OPEN, L"Open GlassPane");
    AppendMenuW(hMenu, MF_STRING, ID_TRAY_TOGGLE_ALL,
                g_globalMasterOn ? L"Master Opacity: Turn OFF" : L"Master Opacity: Turn ON");
    AppendMenuW(hMenu, MF_STRING, ID_TRAY_RESTORE_ALL, L"Reset All Windows to 100%");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hMenu, MF_STRING, ID_TRAY_EXIT, L"Exit");

    SetForegroundWindow(hwnd);
    TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hwnd, nullptr);
    DestroyMenu(hMenu);
}

static LRESULT CALLBACK MainWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE:
        SetTimer(hwnd, ID_TIMER_ENUM, 2000, nullptr);
        return 0;

    case WM_ERASEBKGND:
        return 1; // Prevent flicker; double-buffered WM_PAINT draws entire background

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        RECT rc = {};
        GetClientRect(hwnd, &rc);
        int w = rc.right - rc.left;
        int h = rc.bottom - rc.top;

        if (w > 0 && h > 0) {
            HDC memDC = CreateCompatibleDC(hdc);
            HBITMAP memBmp = CreateCompatibleBitmap(hdc, w, h);
            HGDIOBJ oldBmp = SelectObject(memDC, memBmp);

            PaintGlassPaneCanvas(memDC, w, h);
            BitBlt(hdc, 0, 0, w, h, memDC, 0, 0, SRCCOPY);

            SelectObject(memDC, oldBmp);
            DeleteObject(memBmp);
            DeleteDC(memDC);
        }
        EndPaint(hwnd, &ps);
        return 0;
    }

    case WM_LBUTTONDOWN:
        HandleClientMouseDown(hwnd, GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam));
        return 0;

    case WM_MOUSEMOVE:
        HandleClientMouseMove(hwnd, GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam));
        return 0;

    case WM_LBUTTONUP:
        if (g_draggingSliderHwnd || g_isDraggingScrollbar) {
            g_draggingSliderHwnd = nullptr;
            g_isDraggingScrollbar = false;
            ReleaseCapture();
            InvalidateRect(hwnd, nullptr, FALSE);
        }
        return 0;

    case WM_MOUSEWHEEL: {
        if (g_maxScrollPx > 0) {
            int delta = GET_WHEEL_DELTA_WPARAM(wParam);
            g_scrollOffsetPx = ClampInt(g_scrollOffsetPx - (delta / 3), 0, g_maxScrollPx);
            InvalidateRect(hwnd, nullptr, FALSE);
        }
        return 0;
    }

    case WM_TIMER:
        if (wParam == ID_TIMER_ENUM && IsWindowVisible(hwnd) && !g_draggingSliderHwnd && !g_isDraggingScrollbar) {
            RefreshOpenWindowsList();
        }
        return 0;

    case WM_COMMAND: {
        UINT id = LOWORD(wParam);
        switch (id) {
        case ID_TRAY_OPEN:
            RefreshOpenWindowsList();
            ShowWindow(hwnd, SW_SHOW);
            SetForegroundWindow(hwnd);
            return 0;

        case ID_TRAY_TOGGLE_ALL:
            g_globalMasterOn = !g_globalMasterOn;
            ApplyAllTrackedWindows();
            InvalidateRect(hwnd, nullptr, FALSE);
            return 0;

        case ID_TRAY_RESTORE_ALL:
            for (auto& kv : g_windowStates) {
                kv.second.isActive = false;
                kv.second.percent = 100;
            }
            RestoreAllWindowsOnExit();
            InvalidateRect(hwnd, nullptr, FALSE);
            return 0;

        case ID_TRAY_EXIT:
            RestoreAllWindowsOnExit();
            Shell_NotifyIconW(NIM_DELETE, &g_nid);
            DestroyWindow(hwnd);
            return 0;
        }
        break;
    }

    case WM_TRAYICON:
        if (lParam == WM_LBUTTONUP) {
            if (IsWindowVisible(hwnd)) {
                ShowWindow(hwnd, SW_HIDE);
            } else {
                RefreshOpenWindowsList();
                ShowWindow(hwnd, SW_SHOW);
                SetForegroundWindow(hwnd);
            }
        } else if (lParam == WM_RBUTTONUP || lParam == WM_CONTEXTMENU) {
            ShowTrayContextMenu(hwnd);
        }
        return 0;

    case WM_CLOSE:
        // Closing the utility window hides it to the Windows 11 system tray.
        ShowWindow(hwnd, SW_HIDE);
        return 0;

    case WM_DESTROY:
        RestoreAllWindowsOnExit();
        Shell_NotifyIconW(NIM_DELETE, &g_nid);
        for (auto& kv : g_iconCache) {
            delete kv.second;
        }
        g_iconCache.clear();
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE, PWSTR, int) {
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    Gdiplus::GdiplusStartup(&g_gdiplusToken, &gdiplusStartupInput, nullptr);

    INITCOMMONCONTROLSEX icex = { sizeof(INITCOMMONCONTROLSEX), ICC_STANDARD_CLASSES };
    InitCommonControlsEx(&icex);

    g_hAppIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_GLASSPANE_ICON));
    if (!g_hAppIcon) {
        g_hAppIcon = LoadIconW(nullptr, IDI_APPLICATION);
    }

    WNDCLASSEXW wc = { sizeof(WNDCLASSEXW) };
    wc.style         = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc   = MainWndProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = L"GlassPaneWin11Class";
    wc.hCursor       = LoadCursorW(nullptr, IDC_ARROW);
    wc.hIcon         = g_hAppIcon;
    wc.hIconSm       = g_hAppIcon;
    wc.hbrBackground = nullptr;
    RegisterClassExW(&wc);

    DWORD dwStyle = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX;
    RECT winRect = { 0, 0, CLIENT_WIDTH, CLIENT_HEIGHT };
    AdjustWindowRectEx(&winRect, dwStyle, FALSE, WS_EX_APPWINDOW);
    int totalWidth  = winRect.right - winRect.left;
    int totalHeight = winRect.bottom - winRect.top;

    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);

    g_hMainWnd = CreateWindowExW(
        WS_EX_APPWINDOW,
        wc.lpszClassName,
        L"GlassPane",
        dwStyle,
        (screenW - totalWidth) / 2,
        (screenH - totalHeight) / 2,
        totalWidth,
        totalHeight,
        nullptr,
        nullptr,
        hInstance,
        nullptr
    );

    ApplyWindowThemeAttributes(g_hMainWnd);

    g_nid.cbSize           = sizeof(NOTIFYICONDATAW);
    g_nid.hWnd             = g_hMainWnd;
    g_nid.uID              = 1;
    g_nid.uFlags           = NIF_ICON | NIF_MESSAGE | NIF_TIP;
    g_nid.uCallbackMessage = WM_TRAYICON;
    g_nid.hIcon            = g_hAppIcon;
    wcscpy_s(g_nid.szTip, L"GlassPane — Window Opacity Controller");
    Shell_NotifyIconW(NIM_ADD, &g_nid);

    RefreshOpenWindowsList();
    ShowWindow(g_hMainWnd, SW_SHOW);
    UpdateWindow(g_hMainWnd);

    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    if (g_gdiplusToken) {
        Gdiplus::GdiplusShutdown(g_gdiplusToken);
    }
    return static_cast<int>(msg.wParam);
}
