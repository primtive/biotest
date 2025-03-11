import * as React from 'react';
import { Chart } from './chart';
import { Card } from '@/components/ui/card';
import { CheckCircle, NotepadText, PercentCircle } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/ru'
import prisma from '@/data/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReviewTest } from '@/components/review-test';

moment.locale('ru')

export const metadata = {
  title: 'Статистика по пользователю',
};

export default async function UserStats({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const user = await prisma.user.findFirst({ where: { username }, include: { topicGroup: true } })

  const testHistory = await prisma.test.findMany({
    where: { userId: user?.id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    user
      ?
      <div className='space-y-3'>
        <Card>
          <div className='flex justify-between space-x-10'>
            <div>
              <h1 className='font-bold text-2xl'>{user.name}</h1>
              <h1 className='text-lg mb-3'>{user.username}</h1>
              <h1 className='text-base'>Создан {moment(user.createdAt).format('LLL')}</h1>
              <h1 className='text-base'>Группа: {user.topicGroup.name}</h1>
            </div>
            <div className='flex gap-3 text-xl'>
              <div>
                <p>Очки</p>
                <div className='flex gap-2'>{user.score}<CheckCircle /></div>
              </div>
              <div>
                <p>Тесты</p>
                <div className='flex gap-2'>{user.testsCount}<NotepadText /></div>
              </div>
              <div>
                <p>Процент</p>
                <div className='flex gap-2'>{user.percent}<PercentCircle /></div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h1 className='mb-3'>График тестов</h1>
          <Chart data={testHistory} />
        </Card>

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
                  <TableCell><ReviewTest testId={test.id} /></TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div >
      :
      <p>Пользователь не найден</p>
  );
}