/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@mlc-ai/web-llm']
  }
};

module.exports = nextConfig;
