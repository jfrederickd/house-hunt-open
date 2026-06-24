import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getActivePerson } from "@/lib/active-person";
import { authEnabled } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "House Hunt",
  description: "A private dashboard for tracking off-market house opportunities.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { people, activePersonId } = await getActivePerson();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>
          <SiteHeader
            people={people.map((p) => ({ id: p.id, name: p.name }))}
            activePersonId={activePersonId}
            showLogout={authEnabled()}
          />
          <main className="flex-1 w-full">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
