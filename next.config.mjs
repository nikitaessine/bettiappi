/** @type {import('next').NextConfig} */
const nextConfig = {
  // For this MVP we don't want TypeScript or ESLint
  // errors to block production builds. Next.js will
  // still type-check locally in your editor.
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;

