# PERFORMANCE GUIDELINES

## FlatList Optimization
- Always use `keyExtractor`.
- Use `getItemLayout` for fixed-height items.
- Avoid large images; use `react-native-fast-image` for better caching.

## Component Rendering
- Use `React.memo` for heavy functional components.
- Avoid inline arrow functions in props (e.g., `onPress={() => doSomething()}`). Define them outside the render.
- Use `useCallback` and `useMemo` hooks to stabilize references.

## State Management
- Avoid a single giant global store (Context or Redux).
- Keep state as local as possible.
- Use selectors to prevent unnecessary re-renders.

## Testing
- Regularly test on low-end Android devices to identify bottlenecks.
