import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/password-input';
import { errorMessage } from '@/lib/client-request';

export const UserEdit = ({ data, id, onSave, el, className }: { data?: any, id?: string, onSave: (values: any) => Promise<void>, el: React.ReactNode, className?: string }) => {
  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [topicGroupId, setTopicGroupId] = React.useState('');
  const [isArchive, setIsArchive] = React.useState(false);
  const [group, setGroup] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const prefix = React.useId();

  React.useEffect(() => {
    if (!open) return;
    setName(data?.name ?? '');
    setUsername(data?.username ?? '');
    setTopicGroupId(data?.topicGroupId ?? '');
    setIsArchive(Boolean(data?.isArchive));
    setGroup(data?.group ?? '');
    setPassword('');
    setError('');
  }, [open, id, data?.name, data?.username, data?.topicGroupId, data?.isArchive, data?.group]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onSave({ name: name.trim(), username: username.trim(), id, topicGroupId, isArchive, group: group.trim(), ...(password ? { password } : {}) });
      setOpen(false);
      setPassword('');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
    <DialogTrigger asChild><span className={cn(className, 'inline-flex cursor-pointer')} role="button" tabIndex={0}>{el}</span></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{id ? 'Изменить пользователя' : 'Создать пользователя'}</DialogTitle>
        <DialogDescription>Имя пользователя должно быть уникальным.</DialogDescription>
      </DialogHeader>
      <form onSubmit={save} className="space-y-3">
        <div className="space-y-1"><Label htmlFor={`${prefix}-name`}>Имя</Label><Input id={`${prefix}-name`} required disabled={pending} value={name} onChange={event => setName(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`${prefix}-username`}>Имя пользователя</Label><Input id={`${prefix}-username`} required disabled={pending} value={username} onChange={event => setUsername(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`${prefix}-password`}>{id ? 'Новый пароль (оставьте пустым, чтобы сохранить текущий)' : 'Пароль'}</Label><PasswordInput id={`${prefix}-password`} autoComplete="new-password" required={!id} minLength={8} disabled={pending} value={password} onChange={event => setPassword(event.target.value)} /></div>
        <div className="flex gap-2">
          <div className="w-full space-y-1"><Label htmlFor={`${prefix}-group`}>Группа</Label><Input id={`${prefix}-group`} disabled={pending} value={group} onChange={event => setGroup(event.target.value)} /></div>
          <div className="w-full space-y-1"><Label>Группа заданий</Label><Select required disabled={pending} value={topicGroupId} onValueChange={setTopicGroupId}>
            <SelectTrigger><SelectValue placeholder="Выберите группу заданий" /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="67962669e4f21c30e05aef8b">ЕГЭ</SelectItem><SelectItem value="67962ae5e4f21c30e05aef91">ОГЭ</SelectItem></SelectGroup></SelectContent>
          </Select></div>
        </div>
        <div className="flex gap-2"><Checkbox id={`${prefix}-archive`} checked={isArchive} disabled={pending} onCheckedChange={value => setIsArchive(value === true)} /><Label htmlFor={`${prefix}-archive`}>Архив</Label></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Сохранение…' : 'Сохранить'}</Button>
      </form>
    </DialogContent>
  </Dialog>;
};
