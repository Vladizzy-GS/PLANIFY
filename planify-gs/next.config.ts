import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify("/"),
        })
      );
    }
    return config;
  },
};

export default nextConfig;
