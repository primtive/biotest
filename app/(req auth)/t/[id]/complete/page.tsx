import * as React from 'react';
import prisma from '@/data/prisma';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

export const metadata = {
  title: 'Тест',
};

export default async function CompletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id
  const test = await prisma.test.findFirst({ where: { id }, })
  const allCorrect = test?.answers.reduce((acc, a) => (a.correct ? 0 : 1) + acc, 0) == 0
  return (
    <>
      {allCorrect
        ?
        <p>Все правильно!</p>
        :
        <>
          <p>Ошибки: </p>
          {test?.answers.filter(answer => !answer.correct).map(async answer => {
            const task = await prisma.task.findFirst({ where: { id: answer.taskId }, include: { topic: true } })
            return <Card>
              <p className='mb-1'>Тема: {task?.topic.name}</p>
              <div dangerouslySetInnerHTML={{ __html: task!.html }} />
              <p>Правильный ответ: {task?.answer}</p>
              <p>Ваш ответ: {answer.answer}</p>
            </Card>
          })}
        </>}
      <div className='flex gap-3'>
        <a href='/' className={buttonVariants()}>На главную</a>
        <a href={`/t/${id}/review`} className={buttonVariants({ variant: 'secondary' })}>Разбор</a>
      </div>
    </>

  );
}