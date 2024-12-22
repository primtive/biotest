import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Logo } from "@/components/logo";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";

const font = Open_Sans({
  subsets: ["cyrillic"],
  weight: "400"
});

export const metadata: Metadata = {
  title: "Биотест",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="ru">
      <Providers session={session}>
        <body className={`${font.className} bg-background antialiased flex flex-col items-center`}>
          <Logo />
          <div className="m-2 lg:m-5 space-y-3 max-w-[500px]">
            {children}
          </div>
        </body>
      </Providers>
    </html>
  );
}
