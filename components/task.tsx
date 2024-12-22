import * as React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';

export const Task = ({ task, onAnswer }: { task: { html: string, answer: string, id: string }, onAnswer: (answer: string, id: string) => void }) => {
  const [answer, setAnswer] = React.useState('')

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: task.html }} />
      <div className='flex gap-2'>
        <Input value={answer} onChange={e => setAnswer(e.target.value)} />
        <Button onClick={() => { onAnswer(answer, task.id); setAnswer('') }}>Ответить</Button>
      </div>
    </div>
  )
}
