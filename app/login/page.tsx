import * as React from 'react';
import LoginForm from './login';
import authOptions from '@/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Вход',
};

export default async function Login() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/')
  return (
    <>
      <div className='flex h-fit w-full items-center justify-center px-4'>
        <LoginForm />
      </div>
    </>
  );
}
