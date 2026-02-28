import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
    id: 'zuvo-storage',
    encryptionKey: 'your-encryption-key', // Replace with a secure key derivation
});

export const secureStorage = {
    set: (key: string, value: string | number | boolean | Uint8Array) => {
        storage.set(key, value);
    },
    get: (key: string) => {
        return storage.getString(key);
    },
    delete: (key: string) => {
        storage.delete(key);
    },
    clear: () => {
        storage.clearAll();
    },
};
