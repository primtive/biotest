import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import SidebarLayout from "@/components/sidebar/sidebar-layout";
import { Navbar } from "@/components/sidebar/navbar";
import Particles from "@/components/particles";

const font = Montserrat({
  subsets: ["cyrillic"],
  weight: "500"
});

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
      <body className={`${font.className} antialiased`}>
        <Providers session={session}>
          <SidebarLayout>
            <Navbar />
            <div className="p-2 lg:p-5 w-full">
              <div className="m-auto max-w-[1000px] space-y-3">
                {children}
              </div>
            </div>
            <Particles />
          </SidebarLayout>
        </Providers>
      </body>
    </html>
  );
}
