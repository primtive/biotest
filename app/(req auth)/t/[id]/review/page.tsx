import * as React from 'react';
import prisma from '@/data/prisma';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

export const metadata = {
  title: 'Просмотр теста',
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id
  const test = await prisma.test.findFirst({ where: { id }, })
  return (
    <>
      <p>Задания: </p>
      {test?.answers.map(async answer => {
        const task = await prisma.task.findFirst({ where: { id: answer.taskId }, include: { topic: true } })
        return <Card>
          <p className='mb-1'>Тема: {task?.topic.name}</p>
          <div dangerouslySetInnerHTML={{ __html: task!.html }} />
          <p>Правильный ответ: {task?.answer}</p>
          <p>Ответ ученика: {answer.answer}</p>
        </Card>
      })}
    </>

  );
}