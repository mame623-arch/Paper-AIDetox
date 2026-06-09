/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf-highlighter ships as ESM and must be transpiled by Next
  transpilePackages: ["react-pdf-highlighter"],
  webpack: (config) => {
    // pdfjs-dist는 Node에서 'canvas'를 선택적으로 require 한다.
    // getMetadata에는 필요 없으므로 빈 모듈로 처리해 번들 에러를 막는다.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
