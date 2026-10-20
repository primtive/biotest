'use client';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
type PreviewTask = { html: string; explanation: string; answer: string; source: string; line: string; topic: { name: string } };
export function TaskPreview({ task }: { task: PreviewTask }) {
  // Both HTML fields arrive sanitized by the administrator-only tasks API.
  return <Dialog><DialogTrigger asChild><button type="button" aria-label="Предпросмотр задания" title="Предпросмотр задания" className="inline-flex"><Eye className="w-5 h-5" /></button></DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Предпросмотр задания</DialogTitle><DialogDescription>{task.topic.name}</DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-2">{task.line && <Badge>{task.line} линия</Badge>}{task.source && <Badge>{task.source}</Badge>}</div>
      <div className="break-words" dangerouslySetInnerHTML={{ __html: task.html }} />
      <p><b>Ответ:</b> {task.answer}</p>{task.explanation && <div dangerouslySetInnerHTML={{ __html: task.explanation }} />}
    </DialogContent>
  </Dialog>;
}
