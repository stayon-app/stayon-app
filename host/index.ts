// Web boot loader — injects a branded "StayOn Host" spinner before React paints.
import './src/bootLoader';

// Must be first RN import — required by react-native-gesture-handler
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
