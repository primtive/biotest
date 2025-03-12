import { Card } from '@/components/ui/card';
import * as React from 'react';
import prisma from '@/data/prisma';
import moment from 'moment'
import CountUp from '@/components/count-up';
import 'moment/locale/ru'
import { WeekChart } from '@/components/week-chart';

moment.locale('ru');

export const metadata = {
  title: 'Статистика',
};

interface WeekAggregation {
  weekDate: Date;
  count: number;
  countCompleted: number;
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
      };
    }
    grouped[weekKey].count++;
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

export default async function StatsPage({ searchParams }: { searchParams: any }) {
  const testCount = await prisma.test.count()
  const userCount = await prisma.user.count()
  const taskCount = await prisma.task.count()

  const testHistory = await prisma.test.findMany({
    orderBy: { createdAt: 'asc' },
  })

  const taskCompletedCount = testHistory.reduce((acc, x) => acc + x.answers.length, 0);

  const groupedTests = groupTestsByWeek(testHistory);

  const weekData = groupedTests.map((item) => ({
    weekDate: moment(item.weekDate).format('DD MMM'),
    count: item.count,
    countCompleted: item.countCompleted,
  }));

  return (
    <>
      <p className='text-2xl'>Статистика</p>
      <div className='flex gap-2 flex-wrap'>
        <Card>
          <p className='text-xl'>Пользователи</p>
          <CountUp className='text-2xl' duration={1} end={userCount} />
        </Card>
        <Card>
          <p className='text-xl'>Задания</p>
          <CountUp className='text-2xl' duration={1} end={taskCount} />
        </Card>
        <Card className='w-[100px]'>
          <p className='text-xl'>Тесты</p>
          <CountUp className='text-2xl' duration={1} end={testCount} />
        </Card>
        <Card>
          <p className='text-xl w-min'>Завершено заданий</p>
          <CountUp className='text-2xl' duration={1} end={taskCompletedCount} />
        </Card>
      </div>
      <Card>
        <p className='mb-3'>Тесты по неделям</p>
        <WeekChart data={weekData} />
      </Card>
      <Card>Пока на этом все :)</Card>
    </>
  );
}