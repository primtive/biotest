import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

export const UserEdit = ({ data, id, onSave, el, className }: {data?: any, id?: string, onSave: (values: any) => void, el: React.ReactNode, className?: string}) => {
  const [name, setName] = React.useState(data?.name)
  const [username, setUsername] = React.useState(data?.username)
  const [open, setOpen] = React.useState(false);

  return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger className={className}>
      {el}
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Изменить пользователя</DialogTitle>
        <DialogDescription> ! Имя и имя пользователя должны быть уникальны !</DialogDescription>
      </DialogHeader>

      <Label htmlFor='name' >Имя</Label>
      <Input id='name' value={name} onChange={(e) => setName(e.target.value)} />

      <Label htmlFor='username' >Имя пользователя</Label>
      <Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} />
      <Button onClick={() => { onSave({ name, username, id }); setOpen(false) }}>Сохранить</Button>
    </DialogContent>
  </Dialog>

  )
}
