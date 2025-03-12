import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Logo } from "@/components/logo";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCheck, BookMarked, ChartArea, History, Mails, Users } from "lucide-react";

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
          <div className="m-2 lg:m-5 space-y-3 w-fit max-w-full lg:max-w-[800px]">
            {session &&
              <Card className="w-auto p-2">
                <div className="w-min min-w-fit flex gap-2 flex-wrap">
                  {session.user!.admin ?
                    <>
                      <a href="/admin/history"><Button variant={'secondary'} className="p-2"><History />История</Button></a>
                      <a href="/admin/users"><Button variant={'secondary'} className="p-2"><Users />Пользователи</Button></a>
                      <a href="/admin/tasks"><Button variant={'secondary'} className="p-2"><BookCheck />Задания</Button></a>
                      <a href="/admin/topics"><Button variant={'secondary'} className="p-2"><BookMarked />Темы</Button></a>
                      <a href="/admin/stats"><Button variant={'secondary'} className="p-2"><ChartArea />Статистика</Button></a>
                      {/* <a href="/admin/messages"><Button variant={'secondary'} className="p-2"><Mails />Сообщения</Button></a> */}
                    </>
                    :
                    <>
                      <a href="/history"><Button variant={'secondary'} className="p-2"><History />История</Button></a>
                      <a href="/stats"><Button variant={'secondary'} className="p-2"><ChartArea />Статистика</Button></a>
                    </>
                  }
                </div>
              </Card>
            }
            {children}
          </div>
        </body>
      </Providers>
    </html>
  );
}
