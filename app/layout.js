import "./globals.css";

export const metadata = {
  title: "Envira",
  description: "Simulator-checked RL environments for hardware design.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Kept as a plain Google Fonts link (not next/font) because the WebGL labels
            draw with the literal family name "Figtree" on a 2D canvas. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Figtree:wght@400;500;600&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
