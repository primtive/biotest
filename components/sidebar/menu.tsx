"use client";

import Link from "next/link";
import { BookOpenText, Goal, LogIn, LogOut, Minus, NotepadText, SquareAsterisk } from "lucide-react";
import { usePathname } from "next/navigation";
import { BookCheck, BookMarked, ChartArea, History, Mails, Users, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import { signOut, useSession } from "next-auth/react";
import { SheetClose } from "../ui/sheet";
import React from "react";


interface MenuProps {
  isOpen: boolean | undefined;
  isSheetMenu?: boolean | undefined;
}

export function Menu({ isOpen, isSheetMenu }: MenuProps) {

  const Wrapper = isSheetMenu ? SheetClose : ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>;

  const { data: session } = useSession();
  const pathname = usePathname();
  const menuList = [
    {
      groupLabel: "",
      menus: [
        {
          href: "/",
          label: "Главная",
          icon: House
        }
      ]
    },
    ...session?.user ? [{
      groupLabel: "Навигация",
      menus: [
        {
          href: "/history",
          label: "История",
          icon: History
        },
        {
          href: "/stats",
          label: "Статистика",
          icon: ChartArea
        },
        // {
        //   href: "/wiki",
        //   label: "Вики",
        //   icon: BookOpenText
        // },
        ...(session.user.id === '678017cadefdce0d7375bf07' || session.user.id === '6784f9d99bbfbb23d367b5e0' ? [{
          href: "/secret",
          label: "Секретные функции",
          icon: SquareAsterisk
        }] : [])
      ]
    }] : [
      {
        groupLabel: "",
        menus: [
          {
            href: "/login",
            label: "Войти",
            icon: LogIn
          },
        ]
      }
    ],
    ...session?.user?.admin ? [{
      groupLabel: "Админ",
      menus: [
        {
          label: "История",
          href: "/admin/history",
          icon: History,
        },
        {
          label: "Пользователи",
          href: "/admin/users",
          icon: Users,
        },
        {
          label: "Задания",
          href: "/admin/tasks",
          icon: BookCheck,
        },
        {
          label: "Темы",
          href: "/admin/topics",
          icon: BookMarked,
        },
        {
          label: "Статистика",
          href: "/admin/stats",
          icon: ChartArea,
        },
        {
          label: "Отчеты",
          href: "/admin/reports",
          icon: NotepadText,
        },
        // {
        // label: "Цели",
        // href: "/admin/goals",
        // icon: Goal,
        // }
      ]
    }] : []
  ]

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="pt-8 h-full w-full">
        <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px-40px)] lg:min-h-[calc(100vh-32px-40px-32px-40px)] items-start space-y-1 px-2">
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate">
                  {groupLabel}
                </p>
              ) : !isOpen && isOpen !== undefined && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="w-full flex justify-center items-center">
                        <Minus className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}
              {menus.map(
                ({ href, label, icon: Icon }, index) =>
                  <div className="w-full" key={index}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Wrapper asChild>
                            <Button
                              variant={
                                pathname == href
                                  ? "secondary"
                                  : "ghost"
                              }
                              className="w-full justify-start h-10 mb-1"
                              asChild
                            >
                              <Link href={href}>
                                <span
                                  className={cn(isOpen === false ? "" : "mr-4")}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    "max-w-[200px] truncate",
                                    isOpen === false
                                      ? "-translate-x-96 opacity-0"
                                      : "translate-x-0 opacity-100"
                                  )}
                                >
                                  {label}
                                </p>
                              </Link>
                            </Button>
                          </Wrapper>
                        </TooltipTrigger>
                        {isOpen === false && (
                          <TooltipContent side="right">
                            {label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
              )}
            </li>
          ))}
          {session?.user &&
            <li className="w-full grow flex items-end">
              <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      variant="outline"
                      className="w-full justify-center h-10 mt-5"
                    >
                      <span className={cn(isOpen === false ? "" : "mr-4")}>
                        <LogOut size={18} />
                      </span>
                      <p
                        className={cn(
                          "whitespace-nowrap",
                          isOpen === false ? "opacity-0 hidden" : "opacity-100"
                        )}
                      >
                        Выйти
                      </p>
                    </Button>
                  </TooltipTrigger>
                  {isOpen === false && (
                    <TooltipContent side="right">Выйти</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </li>
          }
        </ul>
      </nav>
    </ScrollArea>
  );
}