import { requireStaff } from "@/lib/server/access";
import * as React from 'react';
import Reports from './reports';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Отчеты',
};

export default async function ReportsPage() {
  const actor = await requireStaff();
  return (
    <>
      <Reports scopeKey={JSON.stringify([actor.id, actor.admin, actor.teacherGroups])} />
      <Toaster />
    </>
  );
}
