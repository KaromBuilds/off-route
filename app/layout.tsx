import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Off Route",
  description: "Colectivo drivers report route exceptions by voice; passengers see which stops have no service and where to go instead.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f172a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="sim-banner">SIMULATED DATA · Demo prototype · Route, stops and peer reports are invented</div>
        <header className="topbar">
          <Link href="/" className="brand">Off Route</Link>
          <nav>
            <Link href="/passenger">Passenger</Link>
            <Link href="/driver">Driver</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
