import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Logo } from "@/components/logo";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const font = Montserrat({
  subsets: ["cyrillic"],
  weight: "500"
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
    <html lang="ru" suppressHydrationWarning>
      <Providers session={session}>
        <body className={`${font.className} bg-background antialiased flex flex-col items-center`}>
          <Logo />
          <div className="m-2 lg:m-5 space-y-3 w-fit max-w-[800px]">
            {session?.user!.admin &&
              <Card className="w-full p-2 flex gap-2 flex-wrap">
                <a href="/admin/stats"><Button variant={'secondary'} className="p-2">История</Button></a>
                <a href="/admin/users"><Button variant={'secondary'} className="p-2">Пользователи</Button></a>
                <a href="/admin/tasks"><Button variant={'secondary'} className="p-2">Задания</Button></a>
                <a href="/admin/topics"><Button variant={'secondary'} className="p-2">Темы</Button></a>
              </Card>
            }
            {children}
          </div>
        </body>
      </Providers>
    </html>
  );
}
