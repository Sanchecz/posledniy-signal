import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "Последний сигнал — интерактивная новелла-кликер",
    description:
      "Мобильная новелла-кликер о станции Ноктюрн: усиливайте сигнал, открывайте анимированные сцены, выбирайте ответы и найдите одну из семи концовок.",
    applicationName: "Последний сигнал",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Сигнал",
    },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Последний сигнал",
      title: "Последний сигнал — интерактивная новелла-кликер",
      description: "Любовь, авантюра или тайна: 12 живых сцен, 10 решений и 7 концовок.",
      images: [
        {
          url: new URL("/og.png", metadataBase).toString(),
          width: 1536,
          height: 1024,
          alt: "Светящееся ядро станции Ноктюрн в тёмном космосе",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Последний сигнал — интерактивная новелла-кликер",
      description: "Любовь, авантюра или тайна: 12 живых сцен, 10 решений и 7 концовок.",
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07070c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
