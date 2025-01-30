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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import EditStringArray from '@/components/string-list-edit';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';


export const TaskEdit = ({ data, id, onSave, el, topics, className }: { data?: any, id?: string, onSave: (values: any) => void, el: React.ReactNode, topics: Array<any>, className?: string }) => {
  const [active, setActive] = React.useState(data?.active)
  const [topicId, setTopicId] = React.useState(data?.topicId)
  const [html, setHtml] = React.useState(data?.html)
  const [answer, setAnswer] = React.useState(data?.answer)
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    setActive(data?.active);
    setTopicId(data?.topicId);
    setHtml(data?.html);
    setAnswer(data?.answer);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(className, 'block')}>
        {el}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить задание</DialogTitle>
          {/* <DialogDescription> ! Пока не работает !</DialogDescription> */}
        </DialogHeader>
        <div className='flex gap-2'>
          <Checkbox id='active' checked={active} onCheckedChange={(val) => setActive(val)}></Checkbox>
          <Label htmlFor='active'>Включить</Label>
        </div>
        <Label htmlFor='html' >Тема</Label>
        <Select defaultValue={topicId} onValueChange={(val) => setTopicId(val)}>
          <SelectTrigger className="">
            <SelectValue placeholder="Выберите тему" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Темы</SelectLabel>
              {topics.map(topic => <SelectItem value={topic.id}>{topic.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className='justify-between flex items-center'>
          <Label htmlFor='html' >HTML код задания</Label>
          <Dialog>
            <DialogTrigger>
              <Button variant={'ghost'} className='w-5 h-min'><Eye /></Button>
            </DialogTrigger>
            <DialogContent>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </DialogContent>
          </Dialog>
        </div>
        <Textarea id='html' value={html} onChange={(e) => setHtml(e.target.value)} className='h-[200px]' />

        <Label htmlFor='answer' >Ответ</Label>
        <EditStringArray initialStrings={answer.split(', ')} onChange={(strings: any) => { setAnswer(strings.join(', ')) }} />
        <Button onClick={() => { onSave({ topicId, html, answer, id, active }); setOpen(false) }}>Сохранить</Button>
      </DialogContent>
    </Dialog>

  )
}
