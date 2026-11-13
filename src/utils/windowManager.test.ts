import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampOpacity,
  percentToAlphaByte,
  alphaByteToPercent,
  computeEffectiveOpacity,
  getOpenApplicationWindows,
  getIgnoredBackgroundProcesses,
  toggleSingleWindowOpacity,
  toggleGlobalMasterOpacity,
  openApplicationWindow,
  closeApplicationWindow,
  spawnCustomApplicationWindow,
  resolveProcessColorScheme,
  DEFAULT_GOLD_BRAND_COLORS,
  exitGlassPaneApp,
  relaunchGlassPaneApp,
  createInitialGlassPaneState,
} from './windowManager';

test('getOpenApplicationWindows dynamically lists only currently open applications and excludes closed or background ones', () => {
  const state = createInitialGlassPaneState();
  const openWindows = getOpenApplicationWindows(state.processes);
  const ignoredBg = getIgnoredBackgroundProcesses(state.processes);

  // 7 apps start open (Discord, Firefox, Spotify, Google Chrome, System Settings, Steam, Notepad)
  // while Windows Terminal and Calculator start closed
  assert.equal(openWindows.length, 7);
  assert.ok(openWindows.some((w) => w.appName === 'Firefox'));
  assert.ok(!openWindows.some((w) => w.appName === 'Windows Terminal'));
  assert.equal(ignoredBg.length, 2);

  // Closing Firefox removes it dynamically from the GlassPane list
  const afterClosingFirefox = closeApplicationWindow(state, 'win-firefox');
  const openAfterClose = getOpenApplicationWindows(afterClosingFirefox.processes);
  assert.equal(openAfterClose.length, 6);
  assert.ok(!openAfterClose.some((w) => w.appName === 'Firefox'));

  // Re-opening Firefox populates it back into the GlassPane list
  const afterReopeningFirefox = openApplicationWindow(afterClosingFirefox, 'win-firefox');
  const openAfterReopen = getOpenApplicationWindows(afterReopeningFirefox.processes);
  assert.equal(openAfterReopen.length, 7);
  assert.ok(openAfterReopen.some((w) => w.appName === 'Firefox'));
});

test('toggleSingleWindowOpacity toggles each application bar independently between ON and OFF without turning off other apps', () => {
  const initial = createInitialGlassPaneState();
  // Discord and Firefox both start ON (isTransparencyActive: true)
  const afterToggleFirefoxOff = toggleSingleWindowOpacity(initial, 'win-firefox');
  const discord = afterToggleFirefoxOff.processes.find((p) => p.id === 'win-discord')!;
  const firefox = afterToggleFirefoxOff.processes.find((p) => p.id === 'win-firefox')!;

  assert.equal(discord.isTransparencyActive, true);
  assert.equal(firefox.isTransparencyActive, false);
  assert.equal(computeEffectiveOpacity(discord, afterToggleFirefoxOff), 50);
  assert.equal(computeEffectiveOpacity(firefox, afterToggleFirefoxOff), 100);
});

test('resolveProcessColorScheme uses DEFAULT_GOLD_BRAND_COLORS when an application color theme cannot be identified', () => {
  const state = createInitialGlassPaneState();
  const notepad = state.processes.find((p) => p.id === 'win-notepad')!;
  assert.equal(notepad.hasIdentifiedColorTheme, false);
  assert.deepEqual(resolveProcessColorScheme(notepad), DEFAULT_GOLD_BRAND_COLORS);

  const withCustomApp = spawnCustomApplicationWindow(state, 'OBS Studio');
  const customApp = withCustomApp.processes.find((p) => p.appName === 'OBS Studio')!;
  assert.equal(customApp.hasIdentifiedColorTheme, false);
  assert.deepEqual(resolveProcessColorScheme(customApp), DEFAULT_GOLD_BRAND_COLORS);
});

test('percentToAlphaByte and clampOpacity map [10..100] to Win32 LWA_ALPHA [26..255]', () => {
  assert.equal(clampOpacity(5), 10);
  assert.equal(clampOpacity(120), 100);
  assert.equal(percentToAlphaByte(100), 255);
  assert.equal(percentToAlphaByte(50), 128);
  assert.equal(alphaByteToPercent(255), 100);
});

test('toggleGlobalMasterOpacity and exitGlassPaneApp restore 100% solid opacity cleanly', () => {
  const initial = createInitialGlassPaneState();
  const disabledState = toggleGlobalMasterOpacity(initial, false);
  const discord = disabledState.processes.find((p) => p.id === 'win-discord')!;
  assert.equal(computeEffectiveOpacity(discord, disabledState), 100);

  const exited = exitGlassPaneApp(initial);
  assert.equal(exited.isAppRunning, false);
  assert.equal(computeEffectiveOpacity(discord, exited), 100);

  const relaunched = relaunchGlassPaneApp(exited);
  assert.equal(relaunched.isAppRunning, true);
  assert.equal(relaunched.isUtilityWindowOpen, true);
  assert.equal(computeEffectiveOpacity(discord, relaunched), 50);
});
