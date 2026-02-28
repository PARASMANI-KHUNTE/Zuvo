import { AppRegistry } from 'react-native';
import * as Sentry from '@sentry/react-native';
import App from './App';
import { name as appName } from './app.json';

Sentry.init({
    dsn: 'YOUR-SENTRY-DSN', // Replace with production DSN
    tracesSampleRate: 1.0,
});

AppRegistry.registerComponent(appName, () => App);
