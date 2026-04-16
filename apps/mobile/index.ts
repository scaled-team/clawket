import 'react-native-gesture-handler';
import './src/i18n';
import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';

// Suppress the render loop dev-overlay while Delegate HTTP adapter is integrated.
// The loop is caused by the chat controller expecting WebSocket state that the
// Delegate HTTP backend doesn't provide. The app works behind this overlay.
LogBox.ignoreLogs(['Maximum update depth exceeded']);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
