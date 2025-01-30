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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export const TopicEdit = ({ data, id, onSave, el, className }: { data?: any, id?: string, onSave: (values: any) => void, el: React.ReactNode, className?: string }) => {
  const [name, setName] = React.useState(data?.name)
  const [active, setActive] = React.useState(data?.active)
  const [topicGroupId, setTopicGroupId] = React.useState(data?.topicGroupId)
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(className, 'block')}>
        {el}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить тему</DialogTitle>
        </DialogHeader>

        <div className='flex gap-2'>
          <Checkbox id='active' checked={active} onCheckedChange={(val) => setActive(val)}></Checkbox>
          <Label htmlFor='active'>Включить</Label>
        </div>
        <Label htmlFor='name' >Название</Label>
        <Input id='name' value={name} onChange={(e) => setName(e.target.value)} />
        <Label>Группа заданий</Label>
        <Select defaultValue={topicGroupId} onValueChange={(val) => setTopicGroupId(val)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Выберите группу заданий" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="67962669e4f21c30e05aef8b">ЕГЭ</SelectItem>
              <SelectItem value="67962ae5e4f21c30e05aef91">ОГЭ</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button onClick={() => { onSave({ name, topicGroupId, id, active }); setOpen(false) }}>Сохранить</Button>
      </DialogContent>
    </Dialog>

  )
}
