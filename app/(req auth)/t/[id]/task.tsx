import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import { Card } from '@/components/ui/card';

export const Task = ({ task, onAnswer }: { task: { html: string, id: string, topic: string }, onAnswer: (answer: string) => void }) => {
  const [answer, setAnswer] = React.useState('')
  // const content = reactStringReplace(task.html, /<img[^>]*>/g, (match, i) => <a>{match}</a>)

  return (
    <Card>
      <h2 className='mb-4 font-light text-muted-foreground text-sm'>
        Тема: {task?.topic}
      </h2>
      <Zoom>
        <div dangerouslySetInnerHTML={{ __html: task?.html }} />
      </Zoom>
      <form onSubmit={e => { e.preventDefault(); onAnswer(answer); setAnswer('') }}>
        <div className='flex gap-2 mt-5'>
          <Input className='h-11 max-w-[300px]' value={answer} onChange={e => setAnswer(e.target.value)} />
          <Button className='h-11' variant="secondary" type='submit'>Ответить</Button>
        </div>
      </form>
    </Card>
  )
}
