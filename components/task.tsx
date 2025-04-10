import * as React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'

export const Task = ({ task, onAnswer }: { task: { html: string, id: string }, onAnswer: (answer: string) => void }) => {
  const [answer, setAnswer] = React.useState('')
  // const content = reactStringReplace(task.html, /<img[^>]*>/g, (match, i) => <a>{match}</a>)

  return (
    <div>
      <Zoom>
        <div dangerouslySetInnerHTML={{ __html: task?.html }} />
      </Zoom>
      <div className='flex gap-2'>
        <Input value={answer} onChange={e => setAnswer(e.target.value)} />
        <Button onClick={(e) => { e.preventDefault(); onAnswer(answer); setAnswer('') }}>Ответить</Button>
      </div>
    </div>
  )
}
