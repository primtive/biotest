import * as React from 'react';
import { WeekChart } from '@/components/week-chart';
import { Card } from '@/components/ui/card';
import moment from 'moment';
import 'moment/locale/ru'
import prisma from '@/data/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReviewTest } from '@/components/review-test';
import { ScoreChart } from '@/components/score-chart';
import { UserCard } from '@/components/user-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreEditor } from './score-editor';

moment.locale('ru')

export const metadata = {
  title: 'Статистика по пользователю',
};

interface WeekAggregation {
  weekDate: Date;
  count: number;
  countCompleted: number;
  score: number;
}

function groupTestsByWeek(tests: any[]): WeekAggregation[] {
  const grouped: { [key: string]: WeekAggregation } = {};

  tests.forEach((test) => {
    if (!test.createdAt) return
    const weekStart = getWeekStartDate(test.createdAt);
    const weekKey = weekStart.toISOString();
    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekDate: weekStart,
        count: 0,
        countCompleted: 0,
        score: 0,
      };
    }
    grouped[weekKey].count++;
    grouped[weekKey].score += test.answers.reduce((acc: any, a: any) => acc + +a.correct, 0);
    if (test.isComplete) grouped[weekKey].countCompleted++;
  });
  return Object.values(grouped).sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime());
}

function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

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

  const groupedTests = groupTestsByWeek(testHistory);

  const weekData = groupedTests.map((item) => ({
    weekDate: moment(item.weekDate).format('DD MMM'),
    count: item.count,
    countCompleted: item.countCompleted,
  }));

  const scoreData = groupedTests.map(item => ({
    weekDate: moment(item.weekDate).format('DD MMM'),
    score: item.score / item.count,
  }))

  return (
    user
      ?
      <div className='space-y-3'>
        <UserCard user={user} />

        <Card>
          <h1 className='mb-3 text-xl'>Графики</h1>
          <h1 className='mb-3'>Количество тестов в неделю</h1>
          <WeekChart data={weekData} />
          <h1 className='mb-3'>Правильных ответов в среднем</h1>
          <ScoreChart data={scoreData} />
        </Card>

        <Card>
          <Tabs defaultValue="tests">
            <TabsList className='max-w-max'>
              <TabsTrigger value="tests">История тестов</TabsTrigger>
              <TabsTrigger value="scores">История начислений очков</TabsTrigger>
            </TabsList>
            <TabsContent value="scores">
              <ScoreEditor userId={user.id} />
              <Table>
                <TableHeader>
                  <TableHead>Дата</TableHead>
                  <TableHead>Очки</TableHead>
                  <TableHead>Источник</TableHead>
                </TableHeader>
                <TableBody>
                  {user.scores.reverse().map(score =>
                    <TableRow>
                      <TableCell>{moment(score.createdAt).format('lll')}</TableCell>
                      <TableCell>{score.score}</TableCell>
                      <TableCell>{score.testId ? <ReviewTest testId={score.testId} /> : 'Вручную'}</TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="tests">
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
            </TabsContent>
          </Tabs>
        </Card>
      </div >
      :
      <p>Пользователь не найден</p>
  );
}