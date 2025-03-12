import * as React from 'react';
import prisma from '@/data/prisma';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react';

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
        console.log(task);
        return <Card>
          <p className='mb-1'>Тема: {task?.topic.name}</p>
          <div dangerouslySetInnerHTML={{ __html: task!.html }} className='mb-3' />
          {task?.disordered && <div className='text-muted-foreground text-sm flex items-center gap-2'><CircleAlert className='w-4 h-4' />Неупорядоченный ответ</div>}
          <p>Правильный ответ: {task?.answer}</p>
          <p className='flex gap-2 items-center'>Ответ ученика: {answer.answer} {answer.correct ? <CheckCircle2 className='w-5 h-5 text-green-700' /> : <XCircle className='w-5 h-5 text-red-400' />}</p>
        </Card>
      })}
    </>

  );
}