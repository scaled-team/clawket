/**
 * Detox config for Clawket mobile (Expo dev-client).
 *
 * iOS is the primary target; Android is scaffolded for CI parity but not
 * required for the Phase 0 smoke. Actual native builds are done via
 *   npm run test:e2e:build
 * which invokes `detox build -c ios.sim.debug`. Do not run the native
 * build as part of any automated CI-cheap check — it is expensive and
 * should be triggered on demand or on a macOS runner.
 */

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/Clawket.app',
      build:
        "set -o pipefail && xcodebuild -workspace ios/Clawket.xcworkspace -scheme Clawket -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | xcpretty",
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath:
        'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew :app:assembleDebug :app:assembleAndroidTest -DtestBuildType=debug && cd ..',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
