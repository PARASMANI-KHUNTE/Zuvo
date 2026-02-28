# SECURITY HARDENING GUIDELINES

## Network Security
- Implement Certificate Pinning using `react-native-cert-pinner`.
- Ensure all API calls are over HTTPS.

## Production Safety
- Remove or disable all `console.log` statements in production builds.
- Use `babel-plugin-transform-remove-console` in `babel.config.js`.

## Build Hardening
- **Android**: Enable ProGuard/R8 obfuscation in `android/app/build.gradle`.
- **Debugging**: Ensure debugging and dev menus are disabled in release builds.

## Data Persistence
- Sensitive data must only be stored in `Keychain` (via `react-native-keychain`).
- Non-sensitive cache should be encrypted if possible (MMKV supports this).
