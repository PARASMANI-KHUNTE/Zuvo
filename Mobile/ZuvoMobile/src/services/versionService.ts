import { Platform } from 'react-native';

const APP_VERSION = '1.0.0';

export const versionService = {
    getAppVersion: () => APP_VERSION,
    getPlatform: () => Platform.OS,
    getVersionHeaders: () => ({
        'X-App-Version': APP_VERSION,
        'X-Platform': Platform.OS,
    }),
};
