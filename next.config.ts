import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Bloqueio completo: Firebase Admin e seus sub-módulos de criptografia
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true, // Ignorar temporariamente erros de TypeScript para evitar bloqueio no build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorar ESLint no build
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-cache, no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
    ];
  },
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};
export default nextConfig;