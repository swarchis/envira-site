// Static export: `npm run build` writes a plain static site to out/ (works on GitHub Pages, Vercel, Netlify).
// For GitHub Pages under /envira-site, build with NEXT_PUBLIC_BASE_PATH=/envira-site.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
