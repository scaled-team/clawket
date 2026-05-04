/**
 * Shared Detox setup — runs after each test file is loaded. The global
 * before/after-all hooks are registered here so every spec gets a fresh
 * app launch with permissions granted.
 *
 * Keep this file minimal: test data / auth stubs live in harness.ts.
 */

// @ts-expect-error — detox is a dev-only peer; resolved from
// @ts-ignore when typechecking without the detox @types installed.
import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: {
      camera: 'YES',
      notifications: 'YES',
      photos: 'YES',
      location: 'inuse',
    },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});
