import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./seo-content.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
  SITE_URL,
} from "@/src/lib/seo";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap"
});

export const viewport: Viewport = {
  // The installed app is edge to edge, so the map must be able to paint under
  // the notch while the interface keeps clear of it through safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ebd5" },
    { media: "(prefers-color-scheme: dark)", color: "#3b3b3b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  title: {
    default: "Predicció de bolets a Catalunya: mapa i condicions avui",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "nature",
  keywords: [
    "predicció de bolets",
    "predicció bolets Catalunya",
    "bolets avui Catalunya",
    "mapa de predicció de bolets",
    "bolets de Catalunya",
    "espècies de bolets",
    "temporada de bolets",
    "hàbitat dels bolets",
    "mapa de bolets",
    "micologia",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ca_ES",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Predicció de bolets a Catalunya: mapa i condicions avui",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Predicció de bolets a Catalunya: mapa i condicions avui",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ca" className={nunitoSans.variable} data-scroll-behavior="smooth"><body><JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DEFAULT_DESCRIPTION, inLanguage: "ca" }, { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` }, { "@type": "Organization", "@id": `${SITE_URL}/#editorial-team`, name: "Equip editorial de Bolets Atles", url: `${SITE_URL}/equip-editorial`, parentOrganization: { "@id": `${SITE_URL}/#organization` } }] }} /><SiteHeader /><main>{children}</main><SiteFooter /><RegisterServiceWorker /><Analytics /><SpeedInsights /></body></html>;
}
