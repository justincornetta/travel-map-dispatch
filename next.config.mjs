/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow next/image to optimize (resize + WebP) the public photos served from
    // Supabase Storage. Wildcard covers the project's <ref>.supabase.co host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
