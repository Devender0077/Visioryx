/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  // Standalone output is for Docker/production; in dev it can interact oddly with chunk serving.
  ...(isProd ? { output: 'standalone' } : {}),
  experimental: {
    proxyTimeout: 300000, // 5 min for streaming (MJPEG, SSE) - streams use getStreamBase() to bypass
  },
  webpack: (config, { dev, isServer }) => {
    // Only set chunkLoadTimeout — never replace `config.output` with `{}` (that strips
    // path/filename/chunkFilename and causes MODULE_NOT_FOUND for numbered chunks + 404 on /_next/static).
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 300000;
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
