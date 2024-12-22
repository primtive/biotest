"use client"
import * as React from 'react';
import { Card, CardContent } from './ui/card';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from './ui/button';

export const Profile = () => {
  const { data: session } = useSession()
  return (
    <Card>
      {session ?
        <div className='flex items-center justify-between'>
          <p>{session.user?.name}</p>
          <Button variant={'secondary'} onClick={() => signOut({ callbackUrl: '/' })}>Выйти</Button>
        </div>
        :
        <p><Link href='/login' className='text-secondary-foreground underline'>Авторизируйся</Link>, чтобы твои результаты видел учитель</p>
      }
    </Card>
  )
}
