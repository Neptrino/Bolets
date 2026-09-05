import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./seo-content.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { FindingSyncAgent } from "@/components/findings/finding-sync-agent";
import { UmamiAnalyticsAgent } from "@/components/umami-analytics-agent";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { editorialTeam, siteAuthor } from "@/data/editorial";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SOCIAL_IMAGE,
  INSTAGRAM_PROFILE_URL,
  SITE_NAME,
  SITE_URL,
} from "@/src/lib/seo";
import { umamiPrivacyGuard } from "@/src/lib/umami-privacy";

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
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  title: {
    default: "Bolets de Catalunya: mapa, espècies i temporada",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "nature",
  keywords: [
    "bolets",
    "bolets Catalunya",
    "bolets de Catalunya",
    "bolets avui Catalunya",
    "on trobar bolets avui",
    "mapa bolets Catalunya",
    "espècies de bolets",
    "tipus de bolets",
    "bolets comestibles Catalunya",
    "temporada de bolets",
    "hàbitat dels bolets",
    "rovellons",
    "fredolics",
    "camagroc",
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
    title: "Bolets de Catalunya: mapa, espècies i temporada",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolets de Catalunya: mapa, espècies i temporada",
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
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return <html lang="ca" className={nunitoSans.variable} data-scroll-behavior="smooth"><body><JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DEFAULT_DESCRIPTION, inLanguage: "ca" }, { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 }, sameAs: [INSTAGRAM_PROFILE_URL], parentOrganization: { "@type": "Organization", name: "Neptrino Consulting SL" } }, { "@type": "Organization", "@id": `${SITE_URL}/#editorial-team`, name: editorialTeam.name, url: editorialTeam.url, parentOrganization: { "@id": `${SITE_URL}/#organization` } }, { "@type": "Person", "@id": siteAuthor.entityId, name: siteAuthor.name, url: siteAuthor.url, jobTitle: siteAuthor.role, description: siteAuthor.summary, worksFor: { "@id": `${SITE_URL}/#organization` } }] }} /><SiteHeader /><main>{children}</main><SiteFooter /><RegisterServiceWorker /><FindingSyncAgent />{umamiWebsiteId ? <><UmamiAnalyticsAgent /><Script id="bolets-umami-privacy" strategy="beforeInteractive">{umamiPrivacyGuard}</Script><Script id="bolets-umami" src="https://analytics.bolets.app/script.js" data-website-id={umamiWebsiteId} data-domains="bolets.app,www.bolets.app" data-do-not-track="true" data-exclude-search="true" data-exclude-hash="true" data-before-send="boletsUmamiBeforeSend" data-performance="true" strategy="afterInteractive" /><Script id="bolets-umami-heatmaps" src="https://analytics.bolets.app/recorder.js" data-website-id={umamiWebsiteId} strategy="afterInteractive" /></> : null}</body></html>;
}
