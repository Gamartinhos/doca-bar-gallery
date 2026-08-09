import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "pitllrcxqhcrhbkwbleu.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (fallback de upload)
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/**" },
      // Google Drive — thumbnails e arquivos públicos
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "drive.usercontent.google.com" },
    ],
  },
};

export default nextConfig;
