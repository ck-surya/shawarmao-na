import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/dm-sans";
import type { Metadata } from "next";
import { StoreProvider } from "@/components/store";
import { Header, Footer, Bag, FloatingBag } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Shawarmao Na | Sector 51, Gurugram",
    template: "%s | Shawarmao Na",
  },
  description:
    "Explore the Shawarmao Na menu. Direct ordering from Sector 51, Gurugram.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <StoreProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <Bag />
          <FloatingBag />
        </StoreProvider>
      </body>
    </html>
  );
}
