import { Profile } from '@/components/profile';
import * as React from 'react';

export default function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <p>Админ</p>
      {children}
    </>
  );
}