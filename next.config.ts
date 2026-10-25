import type { NextConfig } from "next";

const repositoryName = "asaan-hisaab-workshop-reference";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: process.cwd(),
  },
  basePath:
    process.env.GITHUB_ACTIONS === "true" ? `/${repositoryName}` : undefined,
};

export default nextConfig;
