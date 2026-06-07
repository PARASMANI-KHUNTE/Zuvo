/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.output.uniqueName = "zuvo";
        return config;
    },
    compress: true,
    generateEtags: true,
    poweredByHeader: false,
    reactStrictMode: true,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'api.dicebear.com' },
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'www.google.com' }
        ],
        deviceSizes: [640, 768, 1024, 1280, 1536],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ['image/avif', 'image/webp'],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
    },
};

module.exports = nextConfig;
