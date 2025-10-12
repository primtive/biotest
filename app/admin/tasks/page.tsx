import * as React from 'react';
import { TasksTable } from './tasks-table';
import prisma from '@/data/prisma';

export const metadata = {
  title: 'Задания',
};

export default async function TasksPage() {
  const topics = await prisma.topic.findMany()
  const uniqueSources = await prisma.task.findMany({
    distinct: ['source'],
    select: { source: true },
  });
  const sources = uniqueSources.map(s => s.source);
  return (
    <TasksTable initData={{topics, sources}} />
  );
}