import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client", "qrcode"],
  experimental: {
    serverActions: {
      // A Vercel recusa requisições acima de 4,5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
