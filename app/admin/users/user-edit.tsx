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
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export const UserEdit = ({ data, id, onSave, el, className }: { data?: any, id?: string, onSave: (values: any) => void, el: React.ReactNode, className?: string }) => {
  const [name, setName] = React.useState(data?.name)
  const [username, setUsername] = React.useState(data?.username)
  const [topicGroupId, setTopicGroupId] = React.useState(data?.topicGroupId)
  const [isArchive, setIsArchive] = React.useState(data?.isArchive)
  const [group, setGroup] = React.useState(data?.group)
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(className, 'block')}>
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

        <div className='flex gap-2'>
          <div className='w-full'>
            <Label htmlFor='group' >Группа</Label>
            <Input id='group' value={group} onChange={(e) => setGroup(e.target.value)} />
          </div>

          <div className='w-full'>
            <Label>Группа заданий</Label>
            <Select defaultValue={topicGroupId} onValueChange={(val: string) => setTopicGroupId(val)}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder="Выберите группу заданий" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="67962669e4f21c30e05aef8b">ЕГЭ</SelectItem>
                  <SelectItem value="67962ae5e4f21c30e05aef91">ОГЭ</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex gap-2'>
          <Checkbox id='active' checked={isArchive} onCheckedChange={(val: boolean) => setIsArchive(val)}></Checkbox>
          <Label htmlFor='active'>Архив</Label>
        </div>

        <Button onClick={() => { onSave({ name, username, id, topicGroupId, isArchive, group }); setOpen(false) }}>Сохранить</Button>
      </DialogContent>
    </Dialog>

  )
}
