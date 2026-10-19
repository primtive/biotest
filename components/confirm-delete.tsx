'use client';

import { useState, type ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/client-request';

export function ConfirmDelete({ title, description, onDelete, children }: { title: string; description?: string; onDelete: () => Promise<void>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onDelete();
      setOpen(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(''); } }}>
    <AlertDialogTrigger asChild><button type="button" aria-label={title}>{children}</button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle>{description && <AlertDialogDescription>{description}</AlertDialogDescription>}</AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
        <Button variant="destructive" disabled={pending} onClick={remove}>{pending ? 'Сохранение…' : 'Подтвердить'}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
