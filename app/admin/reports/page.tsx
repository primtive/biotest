import * as React from 'react';
import Reports from './reports';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Отчеты',
};

export default function ReportsPage() {
  return (
    <>
      <Reports />
      <Toaster />
    </>
  );
}