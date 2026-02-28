import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import apiClient from './apiClient';

class NotificationService {
    async requestPermission() {
        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Authorization status:', authStatus);
            }
        }
    }

    async getFcmToken() {
        try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
                console.log('FCM Token:', fcmToken);
                await this.sendTokenToBackend(fcmToken);
            }
        } catch (error) {
            console.log('Error getting FCM token', error);
        }
    }

    async sendTokenToBackend(token: string) {
        try {
            await apiClient.post('/notifications/token', { token });
        } catch (error) {
            console.log('Failed to send token to backend', error);
        }
    }

    async init() {
        await this.requestPermission();
        await this.getFcmToken();

        // Listen to foreground messages
        messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            console.log('A new FCM message arrived!', remoteMessage);
            Alert.alert(
                remoteMessage.notification?.title || 'Notification',
                remoteMessage.notification?.body || ''
            );
        });

        // Handle notification tap when app is in background/quit
        messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            console.log('Notification caused app to open from background:', remoteMessage);
            // Handle navigation here
        });

        messaging().getInitialNotification().then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
            if (remoteMessage) {
                console.log('Notification caused app to open from quit state:', remoteMessage);
                // Handle navigation here
            }
        });
    }
}

export const notificationService = new NotificationService();
