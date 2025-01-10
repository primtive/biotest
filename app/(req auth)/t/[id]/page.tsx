import * as React from 'react';
import { notFound } from 'next/navigation'
import prisma from '@/data/prisma';
import { Test } from './test';

export const metadata = {
  title: 'Тест',
};

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id

  try {
    var test = await prisma.test.findFirstOrThrow({ where: { id } })
  } catch {
    notFound();
  }
  if (!test) notFound();;
  const tasks = await prisma.task.findMany({where: {id: {in: test.tasksIds}}})
  return (
    <Test tasks={tasks} initTaskAnswers={test.answers} id={id} />
  );
}