"use client"

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';

export const ScoreEditor = ({userId}: {userId: string}) => {
  const [value, setValue] = React.useState('')
  const [score, setScore] = React.useState(0)
  React.useEffect(() => {
    setScore(parseInt(value))
  }, [value])

  function postScore() {
    fetch(`/api/scores/${userId}`, {method: 'POST', body: JSON.stringify({score})}).then(() => window.location.reload())
    setValue('');
  }

  return (
    <div className='flex gap-3 my-3'>
      <Input className='appearance-none' type="number" value={value} onChange={(e) => setValue(e.target.value)}></Input>
      <Button disabled={score == 0} variant={score >= 0 ? 'default' : 'outline'} className='w-[140px]' onClick={() => postScore()}>{score >= 0 ? 'Начислить' : 'Отнять'}</Button>
    </div>
  )
}
