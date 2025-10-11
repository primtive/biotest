import * as React from 'react';
import { notFound, redirect } from 'next/navigation'
import prisma from '@/data/prisma';
import { Test } from './test';
import authOptions from '@/auth';
import { getServerSession } from 'next-auth/next';

export const metadata = {
  title: 'Тест',
};

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id
  const session = await getServerSession(authOptions)
  const user = session?.user
  try {
    var test = await prisma.test.findFirstOrThrow({ where: { id } })
  } catch {
    notFound();
  }
  if (test.userId != user?.id) notFound();
  if (!test) notFound();
  const tasks = (await prisma.task.findMany(
    {
      where: { id: { in: test.tasksIds } },
      include: { topic: true }
    })
  ).map(task => ({ html: task.html, id: task.id, topic: task.topic.name }))
  return (
    <Test tasks={tasks} initTaskAnswers={test.answers} id={id} />
  );
}