import * as React from 'react';
import { WeekChart } from '@/components/week-chart';
import { Card } from '@/components/ui/card';
import { CheckCircle, NotepadText, PercentCircle, Undo2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/ru'
import prisma from '@/data/prisma';
import { ScoreChart } from '@/components/score-chart';
import authOptions from '@/auth';
import { getServerSession } from 'next-auth/next';
import { UserCard } from '@/components/user-card';

moment.locale('ru')

export const metadata = {
  title: 'Моя статистика',
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

export default async function MyStats() {
  const session = await getServerSession(authOptions)
  const user = await prisma.user.findFirst({ where: { id: session?.user?.id }, include: { topicGroup: true } })

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

      </div >
      :
      <p>Пользователь не найден</p>
  );
}