import authOptions from '@/auth';
import { Profile } from '@/components/profile';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import * as React from 'react';

export default async function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.admin) {console.log('asdasd'); redirect('/')} 
  return (
    <>
      <p></p>
      {children}
    </>
  );
}