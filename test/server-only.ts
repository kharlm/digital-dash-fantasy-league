// Stand-in for the `server-only` package under Vitest. The real one throws
// when imported outside a React Server environment — which is the point in
// the app, but tests import server modules directly on purpose.
export {};
