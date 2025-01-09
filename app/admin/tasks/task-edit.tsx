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

export const TaskEdit = ({ id, onSave, el}: {id: string, onSave?: () => void, el: React.ReactNode}) => {
  const [name, setName] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [open, setOpen] = React.useState(false);

  return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger>
      {el}
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Изменить задание</DialogTitle>
        <DialogDescription> ! Пока не работает !</DialogDescription>
      </DialogHeader>

      {/* <Label htmlFor='html' >Текст задания</Label> */}
      {/* <Input id='html' value={name} onChange={(e) => setName(e.target.value)} /> */}

      {/* <Label htmlFor='answer' >Имя пользователя</Label> */}
      {/* <Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} /> */}
      {/* <Button onClick={() => { onSave({ name, username, id }); setOpen(false) }}>Сохранить</Button> */}
    </DialogContent>
  </Dialog>

  )
}
