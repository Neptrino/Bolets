import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bolets de Catalunya: espècies, hàbitats i temporada",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "nature",
  keywords: [
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
    title: "Bolets de Catalunya: espècies, hàbitats i temporada",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolets de Catalunya: espècies, hàbitats i temporada",
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
  return <html lang="ca" className={nunitoSans.variable} data-scroll-behavior="smooth"><body><JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DEFAULT_DESCRIPTION, inLanguage: "ca" }, { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` }] }} /><SiteHeader /><main>{children}</main><footer className="site-footer"><span>BOLETS·ATLES</span><p>Informació educativa. No identifiqueu ni consumiu bolets només amb aquesta aplicació.</p><span>CATALUNYA · {new Date().getFullYear()}</span></footer><Analytics /><SpeedInsights /></body></html>;
}
