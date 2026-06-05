import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The VAPI web SDK wraps a single Daily.co call object. React StrictMode's
  // dev-only double-mount creates two competing Daily objects → "daily-call-join-error"
  // / "Meeting has ended". Disabling it makes the voice widget reliable in dev.
  reactStrictMode: false,
};

export default nextConfig;
