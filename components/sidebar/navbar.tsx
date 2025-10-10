import { SheetMenu } from "@/components/sidebar/sheet-menu";
import { ThemeToggle } from "../theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 w-full shadow bg-background dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center justify-between">
        <SheetMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}