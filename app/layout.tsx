import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Bolets · Atles de Catalunya",
  description: "Atles ecològic i condicions de fructificació dels bolets de Catalunya."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ca" className={nunitoSans.variable} data-scroll-behavior="smooth"><body><SiteHeader /><main>{children}</main><footer className="site-footer"><span>BOLETS·ATLES</span><p>Informació educativa. No identifiqueu ni consumiu bolets només amb aquesta aplicació.</p><span>CATALUNYA · {new Date().getFullYear()}</span></footer></body></html>;
}
