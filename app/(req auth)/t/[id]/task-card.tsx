"use client"

import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import React from 'react';
import { Button } from '@/components/ui/button';

export default function TaskCard({ task }: { task: { html: string, id: string, topic: string, line: string, source: string } }) {
  const [isReported, setIsReported] = React.useState(false)

  React.useEffect(() => { setIsReported(false); }, [task?.id])

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost"><AlertCircle /> <p className='hidden sm:block'>Пожаловаться</p></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Пожаловаться на задание?</AlertDialogTitle>
              </AlertDialogHeader>
              <p className='text-sm'>
                Его рассмотрит администратор.
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => { fetch(`/api/tasks/${task.id}/report`, { method: 'POST' }); setIsReported(true); }}>Отправить жалобу</AlertDialogAction>
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