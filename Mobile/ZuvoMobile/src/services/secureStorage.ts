import type { MMKV } from 'react-native-mmkv';
const MMKVClass = require('react-native-mmkv').MMKV;

const storage = new MMKVClass({
    id: 'zuvo-storage',
    encryptionKey: 'your-encryption-key', // Replace with a secure key derivation
}) as MMKV;

export const secureStorage = {
    set: (key: string, value: string | number | boolean | Uint8Array) => {
        storage.set(key, value as any);
    },
    get: (key: string) => {
        return storage.getString(key);
    },
    delete: (key: string) => {
        storage.remove(key);
    },
    clear: () => {
        storage.clearAll();
    },
};
