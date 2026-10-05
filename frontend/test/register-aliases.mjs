import { registerHooks } from "node:module";

// Node's type stripping does not resolve tsconfig paths. Mirror the existing
// frontend alias for service tests that import shared presentation utilities.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
