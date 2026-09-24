/**
 * Re-export module for the ups feature.
 *
 * This file exists so the feature folder can expose its own narrow surface
 * (e.g. `import { useCurrentUps } from "@/features/ups"` instead of digging
 * into `/hooks/useCurrentUps`). It also keeps us from having to update every
 * import site if the hook moves.
 *
 * Currently a placeholder — populated as Phase 6 adds `useCurrentUps` etc.
 */
export {};
