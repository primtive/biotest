import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import SidebarLayout from "@/components/sidebar/sidebar-layout";
import { Navbar } from "@/components/sidebar/navbar";

export const metadata: Metadata = {
  title: "Оренбио",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="font-medium antialiased" style={{fontFamily: "Montserrat, sans-serif"}}>
        <Providers session={session?.user ? session : null}>
          <SidebarLayout>
            <Navbar />
            <div className="p-2 lg:p-5 w-full">
              <div className="m-auto max-w-[1000px] space-y-3">
                {children}
              </div>
            </div>
          </SidebarLayout>
        </Providers>
      </body>
    </html>
  );
}
