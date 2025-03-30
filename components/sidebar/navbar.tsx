import { SheetMenu } from "@/components/sidebar/sheet-menu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 w-full shadow bg-background dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className="text-lg font-medium"></h1>
        </div>
      </div>
    </header>
  );
}