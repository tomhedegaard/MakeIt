import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Keep this list aligned with .gitignore plus known non-app trees.
  // `.worktrees/` is gitignored but was NOT eslint-ignored, so a local
  // `npm run lint` drowned in hundreds of leftover-worktree errors.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Gitignored workspaces and artifacts:
    ".worktrees/**",
    "coverage/**",
    "MoveKit/**",
    ".vercel/**",
    ".playwright-mcp/**",
    "supabase/.temp/**",
    // Not the app lint surface:
    "ios/**",
    "android/**",
    "docs/science/science-prototype/**",
  ]),
]);

export default eslintConfig;
