import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, Turbopack walks up past the repo and picks a lockfile from
  // the home directory as the workspace root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  // pdf-parse and the DOCX/PDF writers are Node-only; keep them external so
  // the bundler does not try to trace their optional native paths.
  serverExternalPackages: ["pdf-parse"],

  // pdf-parse's pdfjs-dist dependency polyfills Node's missing DOMMatrix /
  // ImageData / Path2D globals via `require("@napi-rs/canvas")` at runtime,
  // wrapped in a try/catch that only warns on failure (see
  // node_modules/pdfjs-dist/legacy/build/pdf.mjs). That require uses a
  // dynamically created `require` (via `createRequire`), which output file
  // tracing does not follow — so on Vercel it can't find even the base
  // `@napi-rs/canvas` package (confirmed via runtime logs: "Cannot find
  // module '@napi-rs/canvas'"), and every extraction throws "DOMMatrix is
  // not defined". Force both the base package and its Linux binary (Vercel's
  // function runtime) into the trace explicitly.
  outputFileTracingIncludes: {
    "/api/resumes": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
    ],
  },
};

export default nextConfig;
