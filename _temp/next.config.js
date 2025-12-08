/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['pzcninyziugoqkzqauxe.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  // API Routes에서 body parser 비활성화 (큰 payload 처리)
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

module.exports = nextConfig;
