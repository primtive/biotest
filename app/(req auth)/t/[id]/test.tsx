"use client"
import { Task } from '@/components/task';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

enum AnswerCorrect {
  NotAnswered = 0,
  Correct = 1,
  Incorrect = 2
}

type AnswersBD = Array<{ taskId: string, answer: string, correct: boolean }>
type Tasks = Array<{ id: string, html: string, answer: string }>

const combine = (a: Array<any>, b: Array<any>, prop: string) =>
  Object.values(
    [...a, ...b].reduce((acc, v) => {
      if (v[prop])
        acc[v[prop]] = acc[v[prop]]
          ? { ...acc[v[prop]], ...v }
          : { ...v };
      return acc;
    }, {})
  );

function checkAnswer(answer: string, userAnswer: string): boolean {
  if (answer == userAnswer) return true
  for (const singleAnswer of answer.split(', ')) {
    if (singleAnswer == userAnswer) return true
  }
  if (userAnswer == answer.replace(/\s/g, '')) return true
  return false
}

export const Test = ({ tasks, id, initTaskAnswers }: { tasks: Tasks, id: string, initTaskAnswers: AnswersBD }) => {
  const router = useRouter();
  const pathname = usePathname()
  const completePath = `${pathname}/complete`;
  const taskCount = tasks.length
  const [taskIndex, setTaskIndex] = React.useState(initTaskAnswers ? initTaskAnswers.length : 0)
  const [taskAnswers, setTaskAnswers] = React.useState(tasks.map(task => {
    const taskAnswer = initTaskAnswers.find(x => x.taskId == task.id)
    if (taskAnswer) return { id: task.id, answer: task.answer, userAnswer: taskAnswer.answer, correct: taskAnswer.correct ? AnswerCorrect.Correct : AnswerCorrect.Incorrect }
    return { id: task.id, answer: task.answer, userAnswer: '', correct: AnswerCorrect.NotAnswered }
  }))
  const [loading, setLoading] = React.useState(false);

  function onAnswer(answer: string, taskId: string) {
    let items = [...taskAnswers];
    items[taskIndex].userAnswer = answer;
    items[taskIndex].correct = checkAnswer(items[taskIndex].answer, answer) ? AnswerCorrect.Correct : AnswerCorrect.Incorrect;
    setTaskAnswers(items);
    setTaskIndex(taskIndex + 1)
    fetch(`/api/complete-task/${id}`,
      { method: 'POST', body: JSON.stringify(taskAnswers.filter(x => x.correct != AnswerCorrect.NotAnswered)) }
    )
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
    </>
  )
}
