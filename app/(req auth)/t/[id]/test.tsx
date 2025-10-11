"use client"
import { Task } from './task';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

enum Answer {
  NotAnswered = 0,
  Correct = 1,
  Incorrect = 2
}

type AnswersBD = Array<{ taskId: string, answer: string, correct: boolean }>
type Tasks = Array<{ id: string, html: string, topic: string }>


export const Test = ({ tasks, id, initTaskAnswers }: { tasks: Tasks, id: string, initTaskAnswers: AnswersBD }) => {
  const router = useRouter();
  const pathname = usePathname()
  const completePath = `${pathname}/review`;
  const taskCount = tasks.length
  const [taskIndex, setTaskIndex] = React.useState(initTaskAnswers ? initTaskAnswers.length : 0)
  const [taskAnswers, setTaskAnswers] = React.useState(tasks.map(task => {
    const taskAnswer = initTaskAnswers.find(x => x.taskId == task.id)
    if (taskAnswer) return { id: task.id, userAnswer: taskAnswer.answer, correct: taskAnswer.correct ? Answer.Correct : Answer.Incorrect }
    return { id: task.id, userAnswer: '', correct: Answer.NotAnswered }
  }))
  const [loading, setLoading] = React.useState(false);

  async function onAnswer(answer: string) {
    let items = [...taskAnswers];
    items[taskIndex].userAnswer = answer;
    const res = await fetch(`/api/tasks/${items[taskIndex].id}/complete`,
      { method: 'POST', body: JSON.stringify({ ...items[taskIndex], testId: id }) }
    )
    const data = await res.json()
    items[taskIndex].correct = data.correct ? Answer.Correct : Answer.Incorrect;
    setTaskAnswers(items);
    setTaskIndex(taskIndex + 1)
  }

  React.useEffect(() => {
    if (taskCount == taskIndex) {
      setLoading(true)
      fetch(`/api/complete/${id}`,
        { method: 'POST', body: JSON.stringify(taskAnswers) }
      ).then(res => router.push(completePath))
    }
  }, [taskIndex])

  return (
    // <div className='max-w-[600px] space-y-3 mx-auto'>
    <>
      <Card className='flex justify-between'>
        <div className='flex gap-1 items-center'>
          {taskAnswers.map(task => {
            var color;
            switch (task.correct) {
              case Answer.NotAnswered:
                color = 'bg-slate-300'
                break
              case Answer.Correct:
                color = 'bg-green-600'
                break
              case Answer.Incorrect:
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
        {loading ?
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin")}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          :
          <Task task={tasks[taskIndex]} onAnswer={onAnswer} />}
      </div>
      {/* </div> */}
    </>
  )
}
