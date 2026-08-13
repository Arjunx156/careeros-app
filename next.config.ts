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
};

export default nextConfig;
