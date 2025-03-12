import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Undo2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/ru'
import prisma from '@/data/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReviewTest } from '@/components/review-test';
import authOptions from '@/auth';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';

moment.locale('ru')

export const metadata = {
  title: 'Моя статистика',
};

export default async function MyHistory() {
  const session = await getServerSession(authOptions)
  const user = await prisma.user.findFirst({ where: { id: session?.user?.id }, include: { topicGroup: true } })

  const testHistory = await prisma.test.findMany({
    where: { userId: user?.id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    user
      ?
      <div className='space-y-3'>

        <Card>
          <h1>История тестов</h1>
          <Table>
            <TableHeader>
              <TableHead>Начало теста</TableHead>
              <TableHead></TableHead>
              <TableHead>Время</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {testHistory.reverse().map(test =>
                <TableRow>
                  <TableCell>{moment(test.createdAt).format('lll')}</TableCell>
                  <TableCell>{test.answers.reduce((acc, a) => acc + (+a.correct), 0) + '/' + test.answers.length}</TableCell>
                  <TableCell>{test.isComplete ? moment(new Date(test.completedAt!.valueOf() - test.createdAt!.valueOf())).format('mm:ss') : 'Не пройден'}</TableCell>
                  <TableCell>{test.isComplete ?
                    <ReviewTest testId={test.id} /> :
                    <Link href={`/t/${test.id}`}><Undo2 className='w-5 h-5' /></Link>}</TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div >
      :
      <p>Пользователь не найден</p>
  );
}