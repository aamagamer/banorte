/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The MCP client spawns a real child process (the MCP server) and keeps a
  // long-lived stdio connection — keep these external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["@modelcontextprotocol/sdk", "@anthropic-ai/sdk"],
  },
};
export default nextConfig;
