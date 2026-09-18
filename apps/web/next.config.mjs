/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@axiom/shared"],
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: "/api/math/:path*",
        destination: `${process.env.MATH_SERVICE_URL ?? "http://localhost:8000"}/math/:path*`,
      },
    ];
  },
};

export default nextConfig;

