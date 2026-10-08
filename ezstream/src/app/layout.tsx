import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "./components/layout/Header"
import ReduxWrapper from "@/redux/ReduxWrapper"


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ezStream — Go live from your browser",
  description:
    "Bring guests into a room, compose the shot with overlays, and stream to YouTube, Twitch or any RTMP destination without installing anything.",
}

export const viewport: Viewport = {
  themeColor: "#020108",
  colorScheme: "dark",
}

// HTML-in-Canvas (used by the stream compositor) is an origin trial in Chrome;
// set the token for the deployed origin to enable it without a browser flag.
const htmlInCanvasToken = process.env.NEXT_PUBLIC_HTML_IN_CANVAS_OT_TOKEN

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      {htmlInCanvasToken && (
        <head>
          <meta httpEquiv="origin-trial" content={htmlInCanvasToken} />
        </head>
      )}
      <body className="bg-background font-sans text-foreground antialiased">
        <ReduxWrapper>
          <Header />
          {children}
        </ReduxWrapper>
      </body>
    </html>
  )
}
