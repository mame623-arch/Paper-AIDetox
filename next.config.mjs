/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf-highlighter ships as ESM and must be transpiled by Next
  transpilePackages: ["react-pdf-highlighter"],
};

export default nextConfig;
