import { mock } from "bun:test";

// `server-only` throws outside a React Server environment; it's a no-op marker in tests.
mock.module("server-only", () => ({}));
