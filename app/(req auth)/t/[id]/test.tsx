"use client"
import { Task } from './task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { errorMessage, requestJson } from '@/lib/client-request';
import * as React from 'react';

enum Answer {
  NotAnswered = 0,
  Correct = 1,
  Incorrect = 2
}

type AnswersBD = Array<{ taskId: string, answer: string, correct: boolean }>
type Tasks = Array<{ id: string, html: string, topic: string, line: string, source: string }>

export const Test = ({ tasks, id, initTaskAnswers }: { tasks: Tasks, id: string, initTaskAnswers: AnswersBD }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { update } = useSession();
  const [taskAnswers, setTaskAnswers] = React.useState(() => tasks.map(task => {
    const answer = initTaskAnswers.find(x => x.taskId === task.id);
    return { id: task.id, userAnswer: answer?.answer ?? '', correct: answer ? (answer.correct ? Answer.Correct : Answer.Incorrect) : Answer.NotAnswered };
  }));
  const [pending, setPending] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [error, setError] = React.useState('');
  const sending = React.useRef(false);
  const completing = React.useRef(false);
  const taskIndex = taskAnswers.findIndex(answer => answer.correct === Answer.NotAnswered);
  const allAnswered = tasks.length > 0 && taskIndex === -1;

  async function onAnswer(answer: string) {
    if (sending.current || taskIndex < 0) return;
    sending.current = true;
    setPending(true);
    setError('');
    const taskId = tasks[taskIndex].id;
    try {
      const data = await requestJson<{ correct: boolean }>(`/api/tasks/${taskId}/complete`, {
        method: 'POST', body: JSON.stringify({ testId: id, userAnswer: answer }),
      });
      setTaskAnswers(items => items.map(item => item.id === taskId ? {
        ...item, userAnswer: answer, correct: data.correct ? Answer.Correct : Answer.Incorrect,
      } : item));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  const complete = React.useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    setFinishing(true);
    setError('');
    try {
      await requestJson(`/api/complete/${id}`, { method: 'POST' });
      await update();
      router.refresh();
      router.replace(`${pathname}/review`);
    } catch (error) {
      completing.current = false;
      setFinishing(false);
      setError(errorMessage(error));
    }
  }, [id, pathname, router, update]);

  React.useEffect(() => {
    if (allAnswered) void complete();
  }, [allAnswered, complete]);

  return <>
    <Card className='flex justify-between'>
      <div className='flex flex-wrap gap-1 items-center'>
        {taskAnswers.map(task => <div key={task.id} className={cn('h-4 w-4 rounded-sm', task.correct === Answer.NotAnswered ? 'bg-slate-300' : task.correct === Answer.Correct ? 'bg-green-600' : 'bg-red-500')} />)}
      </div>
      <p className='leading-none'>{allAnswered ? `${tasks.length}/${tasks.length}` : `№ ${taskIndex + 1}/${tasks.length}`}</p>
    </Card>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {allAnswered ?
      <div aria-live="polite">{finishing ? <p>Сохранение результата…</p> : <Button onClick={() => void complete()}>Повторить завершение</Button>}</div>
      : tasks[taskIndex] ? <Task key={tasks[taskIndex].id} task={tasks[taskIndex]} onAnswer={onAnswer} pending={pending} />
      : <p role="alert">В тесте нет доступных заданий.</p>}
  </>;
}
