import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Cloudinary on real Node https — Turbopack bundling breaks upload_stream.
  serverExternalPackages: ["cloudinary"],
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
