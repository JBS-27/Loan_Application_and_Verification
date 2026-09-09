import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/customer", destination: "/dashboard", permanent: false },
      { source: "/dashboard/staff", destination: "/queue", permanent: false },
      { source: "/dashboard/admin", destination: "/dashboard", permanent: false },
      { source: "/dashboard/admin/settings", destination: "/settings", permanent: false },
      { source: "/dashboard/customer/apply", destination: "/applications/new", permanent: false },
      { source: "/dashboard/customer/loans/:id", destination: "/applications/:id", permanent: false },
      { source: "/dashboard/staff/loans/:id", destination: "/applications/:id", permanent: false },
    ];
  },
};

export default nextConfig;
