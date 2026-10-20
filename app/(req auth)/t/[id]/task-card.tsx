"use client"

import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import React from 'react';
import { Button } from '@/components/ui/button';
import { errorMessage, requestJson } from '@/lib/client-request';

export default function TaskCard({ task }: { task: { html: string, id: string, topic: string, line: string, source: string } }) {
  const [isReported, setIsReported] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => { setIsReported(false); setError(''); setOpen(false); }, [task?.id])

  async function report() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await requestJson(`/api/tasks/${task.id}/report`, { method: 'POST' });
      setIsReported(true);
      setOpen(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return <>
    <div className='flex gap-3 justify-between items-center mb-3'>
      <div>
        <div className='flex gap-2'>
          {task?.line && <Badge className='mb-2'>{task?.line} линия</Badge>}
          {task?.source && <Badge className='mb-2'>Источник: {task?.source}</Badge>}
        </div>
        <h2 className='font-light text-muted-foreground text-sm'>
          Тема: {task?.topic}
        </h2>
      </div>
      {isReported ?
        <div className='flex gap-2 items-center text-muted-foreground text-sm'>
          <CheckCircle /> Жалоба отправлена
        </div>
        : <>
          <AlertDialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost"><AlertCircle /> <p className='hidden sm:block'>Пожаловаться</p></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Пожаловаться на задание?</AlertDialogTitle>
                <AlertDialogDescription>Его рассмотрит администратор.</AlertDialogDescription>
              </AlertDialogHeader>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
                <Button disabled={pending} onClick={report}>{pending ? 'Отправка…' : 'Отправить жалобу'}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    </div>
    <Zoom>
      <div dangerouslySetInnerHTML={{ __html: task?.html }} />
    </Zoom>
  </>
}
