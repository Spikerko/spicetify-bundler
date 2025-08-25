import type SpicetifyTypes from "./Source/Types/Spicetify.ts"

// deno-lint-ignore no-explicit-any
export const Spicetify: typeof SpicetifyTypes = (globalThis as any).Spicetify;