import Link from "next/link";
import { MenuIcon, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Menu } from "@/components/sidebar/menu";
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "../logo";

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8 border-secondary shadow-sm" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:w-72 px-3 h-full flex flex-col" side="left" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <Logo className="ml-4 mt-3" />
        </SheetHeader>
          <Menu isOpen isSheetMenu />
      </SheetContent>
    </Sheet>
  );
}
