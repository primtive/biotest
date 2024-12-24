"use client"
import { Task } from '@/components/task';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as React from 'react';

enum AnswerCorrect {
  NotAnswered = 0,
  Correct = 1,
  Incorrect = 2
}

function checkAnswer(answer: string, userAnswer: string): boolean {
  if (answer == userAnswer) return true
  for (const singleAnswer of answer.split(', ')) {
    if (singleAnswer == userAnswer) return true
  }
  if (userAnswer == answer.replace(/\s/g, '')) return true
  return false
}

export const Test = ({ tasks }: { tasks: Array<{ id: string, html: string, answer: string }> }) => {
  const taskCount = tasks.length
  const [taskIndex, setTaskIndex] = React.useState(0)
  const [taskAnswers, setTaskAnswers] = React.useState(tasks.map(task => { return { id: task.id, answer: task.answer, userAnswer: '', correct: AnswerCorrect.NotAnswered } }))

  function onAnswer(answer: string, id: string) {
    let items = [...taskAnswers];
    items[taskIndex].userAnswer = answer;
    items[taskIndex].correct = checkAnswer(items[taskIndex].answer, answer) ? AnswerCorrect.Correct : AnswerCorrect.Incorrect;
    setTaskAnswers(items);
    setTaskIndex(taskIndex + 1)
  }

  return (
    <>
      <Card className='flex justify-between'>
        <div className='flex gap-1 items-center'>
          {taskAnswers.map(task => {
            var color;
            switch (task.correct) {
              case AnswerCorrect.NotAnswered:
                color = 'bg-slate-300'
                break
              case AnswerCorrect.Correct:
                color = 'bg-green-600'
                break
              case AnswerCorrect.Incorrect:
                color = 'bg-red-500'
                break
            }
            return <div className={cn('h-4 w-4 rounded-sm', color)} />
          }
          )}
        </div>
        <p className='leading-none'>{`№ ${taskIndex + 1}/${taskCount}`}</p>
      </Card>
      <div>
        <Task task={tasks[taskIndex]} onAnswer={onAnswer} />
      </div>
    </>
  )
}
