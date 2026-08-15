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

  // pdf-parse's pdfjs-dist dependency reaches for two kinds of files that
  // output file tracing keeps missing, because both are loaded through
  // dynamic require()/import() rather than a static one it can follow:
  //   1. `@napi-rs/canvas` (+ its platform binary), used to polyfill Node's
  //      missing DOMMatrix/ImageData/Path2D globals (confirmed via runtime
  //      logs: "Cannot find module '@napi-rs/canvas'").
  //   2. `pdf.worker.mjs` and friends under pdfjs-dist itself — even in
  //      Node's synchronous "fake worker" fallback, pdfjs still imports the
  //      worker module inline (confirmed: "Setting up fake worker failed:
  //      Cannot find module '.../pdfjs-dist/legacy/build/pdf.worker.mjs'").
  // Trace the whole pdfjs-dist tree rather than individual files — it has
  // more runtime-loaded assets (cmaps, standard fonts) than are worth
  // enumerating one crash at a time.
  outputFileTracingIncludes: {
    "/api/resumes": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/pdfjs-dist/**",
    ],
  },
};

export default nextConfig;
