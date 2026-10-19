import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TaskCard from './task-card';

export const Task = ({ task, onAnswer, pending }: { task: { html: string, id: string, topic: string, line: string, source: string }, onAnswer: (answer: string) => Promise<void>, pending: boolean }) => {
  const [answer, setAnswer] = React.useState('')

  return (
    <Card>
      <TaskCard task={task}  />
      <form onSubmit={e => { e.preventDefault(); void onAnswer(answer); }}>
        <div className='flex gap-2 mt-5'>
          <Input aria-label="Ответ" className='h-11 max-w-[300px]' disabled={pending} value={answer} onChange={e => setAnswer(e.target.value)} />
          <Button className='h-11' variant="secondary" type='submit' disabled={pending}>{pending ? 'Сохранение…' : 'Ответить'}</Button>
        </div>
      </form>
    </Card>
  )
}
