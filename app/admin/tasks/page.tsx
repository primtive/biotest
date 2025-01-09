import * as React from 'react';
import { TasksTable } from './tasks-table';
import prisma from '@/data/prisma';

export const metadata = {
  title: 'Задания',
};

export default async function TasksPage() {
  const topics = await prisma.topic.findMany()
  return (
    <TasksTable topics={topics} />
  );
}