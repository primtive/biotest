import { requireStaff } from '@/lib/server/access';
import * as React from 'react';

export default async function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireStaff();
  return (
    <>
      {children}
    </>
  );
}
