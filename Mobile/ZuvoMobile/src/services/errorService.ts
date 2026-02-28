import * as Sentry from '@sentry/react-native';

export const errorService = {
    captureException: (error: any, context?: any) => {
        console.error(error, context);
        Sentry.captureException(error, {
            extra: context,
        });
    },
    captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
        Sentry.captureMessage(message, level);
    },
    trackApiError: (error: any, requestConfig: any) => {
        Sentry.captureException(error, {
            tags: {
                type: 'api_error',
                method: requestConfig?.method,
                url: requestConfig?.url,
            },
            extra: {
                data: requestConfig?.data,
                status: error.response?.status,
            },
        });
    },
    trackSocketError: (error: any) => {
        Sentry.captureException(error, {
            tags: {
                type: 'socket_error',
            },
        });
    },
};
