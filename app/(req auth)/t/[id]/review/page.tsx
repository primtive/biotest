import * as React from 'react';
import prisma from '@/data/prisma';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, CircleAlert, MessageCircleQuestion, XCircle } from 'lucide-react';

export const metadata = {
  title: 'Просмотр теста',
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = (await params).id
  const test = await prisma.test.findFirst({ where: { id }, include: { tasks: { include: { topic: true } } } })
  return (
    <>
      <p>Задания: </p>
      {test?.tasks.map(task => {
        const answer = test.answers.find(x => x.taskId == task.id)
        return <Card>
          <h2 className='mb-4 font-light text-muted-foreground text-sm'>
            Тема: {task?.topic.name}
          </h2>
          <div dangerouslySetInnerHTML={{ __html: task?.html }} />
          <div className='border-2 mt-3 p-3 rounded-sm font-normal space-y-1'>
            {task?.disordered && <div className='text-muted-foreground text-sm flex items-center gap-2'><CircleAlert className='w-4 h-4' />Неупорядоченный ответ</div>}
            <p><b>Ответ:</b> {task?.answer}</p>
            <p className='flex gap-2 items-center'>
              {answer?.answer ? <><b>Ваш ответ:</b> {answer?.answer}</> : 'Нет ответа'}
              {answer?.correct ?
                <CheckCircle2 className='w-5 h-5 text-green-700' />
                :
                <XCircle className='w-5 h-5 text-red-400' />}
            </p>
            {task?.explanation &&
              <>
                <p className='mt-5'><b>Пояснение: </b></p>
                <div dangerouslySetInnerHTML={{ __html: task?.explanation }} />
              </>
            }
          </div>
        </Card>
      })}
      <div className='flex gap-3'>
        <a href='/' className={buttonVariants()}>На главную</a>
      </div>
    </>

  );
}