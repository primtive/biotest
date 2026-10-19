import { requireAdmin } from "@/lib/server/access";
import * as React from 'react';
import Reports from './reports';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Отчеты',
};

export default async function ReportsPage() {
  await requireAdmin();
  return (
    <>
      <Reports />
      <Toaster />
    </>
  );
}