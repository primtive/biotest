import { Card } from '@/components/ui/card';
import * as React from 'react';
import prisma from '@/data/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import moment from 'moment'
import 'moment/locale/ru'
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { UserBadge } from '@/components/user-badge';
import { ReviewTest } from '@/components/review-test';

moment.locale('ru');

export const metadata = {
  title: 'История',
};

const pageSize = 30;

export default async function HistoryPage({ searchParams }: { searchParams: any }) {
  const testCount = await prisma.test.count()
  const pageNumber = parseInt((await searchParams).page) || 1
  const pageCount = Math.ceil(testCount / pageSize)

  const lastTests = await prisma.test.findMany({
    take: -pageSize,
    include: { user: true, topicGroup: true },
    where: { user: { isArchive: false } },
    orderBy: { createdAt: 'asc' },
    skip: (pageNumber - 1) * pageSize,
  })

  return (
    <>
      <Card>
        <p>История тестов</p>
        <br />
        <Table>
          <TableHeader>
            <TableHead className='w-[230px]'>Пользователь</TableHead>
            <TableHead className='min-w-[200px]'>Начало теста</TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead>Время</TableHead>
            <TableHead></TableHead>
          </TableHeader>
          <TableBody>
            {lastTests.reverse().map(test =>
              <TableRow>
                <TableCell>{<UserBadge username={test.user?.username} name={test.user?.name || 'Аноним'} />}</TableCell>
                <TableCell>{moment(test.createdAt).format('lll')}</TableCell>
                <TableCell>{test.topicGroup.name}</TableCell>
                <TableCell>{test.answers.reduce((acc, a) => acc + (+a.correct), 0) + '/' + test.answers.length}</TableCell>
                <TableCell>{test.isComplete ? moment(new Date(test.completedAt!.valueOf() - test.createdAt!.valueOf())).format('mm:ss') : 'Не пройден'}</TableCell>
                <TableCell><ReviewTest testId={test.id} /></TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </Card>
      <div className='flex items-center gap-3'>
        <Button disabled={pageNumber == 1} className='h-min p-2' asChild={pageNumber != 1}>
          <Link href={`?page=${pageNumber - 1}`}><ArrowLeft /></Link>
        </Button>
        <span>
          Страница{' '}
          <strong>
            {pageNumber} из {pageCount}
          </strong>{' '}
        </span>
        <Button disabled={pageNumber == pageCount} className='h-min p-2' asChild={pageNumber != pageCount}>
          <Link href={`?page=${pageNumber + 1}`}><ArrowRight /></Link>
        </Button>
      </div>
    </>
  );
}