/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'znxaurlyjgyklqtjjivu.supabase.co',
      },
    ],
  },
}

export default nextConfig