import { Card } from '@/components/ui/card';
import * as React from 'react';
import prisma from '@/data/prisma';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import moment from 'moment'
import 'moment/locale/ru'

moment.locale('ru');

export const metadata = {
  title: 'Статистика',
};

export default async function StatsPage() {
  const lastTests = await prisma.test.findMany({ take: 10, include: { user: true } })

  return (
    <>
      <Card>
        <p>Последние прохождения тестов</p>
        <br />
        <Table>
          <TableBody>
            {lastTests.reverse().map(test => <TableRow>
              <TableCell>{test.isComplete ? moment(test.completedAt).format('lll') : 'Не пройден'}</TableCell>
              <TableCell>{test.user?.name || 'Аноним'}</TableCell>
              <TableCell>{test.answers.reduce((acc, a) => acc + (+a.correct), 0) + '/' + test.answers.length}</TableCell>
              <TableCell>{test.isComplete ? moment(new Date(test.completedAt!.valueOf() - test.createdAt!.valueOf())).format('mm:ss') : 'Не пройден'}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}