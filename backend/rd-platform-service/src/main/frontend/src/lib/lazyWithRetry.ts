import { lazy, type ComponentType } from "react";

/**
 * Wraps React.lazy with automatic recovery from stale chunk errors.
 *
 * When a new build is deployed, previously-loaded index.html may reference
 * chunk filenames that no longer exist (hash changed), causing
 * "Failed to fetch dynamically imported module" errors. This helper:
 *  1. Retries the dynamic import once after a short delay (covers transient
 *     network blips / mid-deploy races).
 *  2. If it still fails, forces a single full page reload (guarded by
 *     sessionStorage to avoid reload loops) so the browser fetches the latest
 *     index.html and the correct chunk references.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retryKey?: string,
) {
  const key = `chunk-reload-${retryKey ?? importer.toString().slice(0, 64)}`;

  return lazy(async () => {
    try {
      const mod = await importer();
      // success: clear any previous reload flag for this chunk
      window.sessionStorage.removeItem(key);
      return mod;
    } catch (err: any) {
      const message = String(err?.message || err);
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message) ||
        err?.name === "ChunkLoadError";

      if (isChunkError) {
        // Try once more after a short delay (transient / mid-deploy race)
        try {
          await new Promise((r) => setTimeout(r, 400));
          const mod = await importer();
          window.sessionStorage.removeItem(key);
          return mod;
        } catch {
          // Still failing: force a single hard reload to pick up new index.html
          const alreadyReloaded = window.sessionStorage.getItem(key);
          if (!alreadyReloaded) {
            window.sessionStorage.setItem(key, "1");
            window.location.reload();
            // Return a never-resolving promise so React keeps the Suspense
            // fallback visible until the reload kicks in.
            return new Promise<{ default: T }>(() => {});
          }
        }
      }
      throw err;
    }
  });
}
