import * as React from 'react';
import { Card } from './ui/card';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { CircleCheck, CirclePercent } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getServerSession } from 'next-auth';
import authOptions from '@/auth';
import SignOut from './signout';

export const Profile = async () => {
  const session = await getServerSession(authOptions);
  return (
    <Card className=''>
      {session ?
        <TooltipProvider>
          <div className='flex items-center justify-between'>
            <div>
              <p>{session.user?.name}</p>
              {session.user?.admin && <Badge className='px-1' variant={'secondary'}>админ</Badge>}
            </div>
            <div className='flex gap-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='flex gap-1 items-center'>
                    <p>{session.user?.score}</p>
                    <CircleCheck className='w-5 h-5' />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Правильно выполненных заданий</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='flex gap-1 items-center'>
                    <p>{session.user?.percent}</p>
                    <CirclePercent className='w-5 h-5' />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Процент правильных заданий за последние 10 тестов</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <SignOut />
          </div>
        </TooltipProvider>
        :
        <p><Link href='/login' className='text-secondary-foreground underline'>Авторизируйся</Link>, чтобы твои результаты видел учитель</p>
      }
    </Card>
  )
}
