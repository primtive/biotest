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
  const [disordered, setDisordered] = React.useState(data?.disordered)
  const [topicId, setTopicId] = React.useState(data?.topicId)
  const [html, setHtml] = React.useState(data?.html)
  const [explanation, setExplanation] = React.useState(data?.explanation)
  const [answer, setAnswer] = React.useState(data?.answer)
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    setActive(data?.active);
    setDisordered(data?.disordered);
    setTopicId(data?.topicId);
    setHtml(data?.html);
    setExplanation(data?.explanation);
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
        <div className='flex gap-2'>
          <Checkbox id='disordered' checked={disordered} onCheckedChange={(val) => setDisordered(val)}></Checkbox>
          <Label htmlFor='disordered'>Неупорядоченное</Label>
        </div>
        <Label htmlFor='topic' >Тема</Label>
        <Select defaultValue={topicId} onValueChange={(val) => setTopicId(val)}>
          <SelectTrigger id='topic'>
            <SelectValue placeholder="Выберите тему" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Темы</SelectLabel>
              {topics.map(topic => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className='justify-between flex items-center'>
          <Label htmlFor='content' >HTML код задания</Label>
          <Dialog>
            <DialogTrigger>
              <Button variant={'ghost'} className='w-5 h-min'><Eye /></Button>
            </DialogTrigger>
            <DialogContent>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </DialogContent>
          </Dialog>
        </div>
        <Textarea id='content' value={html} onChange={(e) => setHtml(e.target.value)} className='h-[150px]' />


        <div className='justify-between flex items-center'>
          <Label htmlFor='explanation' >HTML код пояснения</Label>
          <Dialog>
            <DialogTrigger>
              <Button variant={'ghost'} className='w-5 h-min'><Eye /></Button>
            </DialogTrigger>
            <DialogContent>
              <div dangerouslySetInnerHTML={{ __html: explanation }} />
            </DialogContent>
          </Dialog>
        </div>
        <Textarea id='explanation' value={explanation} onChange={(e) => setExplanation(e.target.value)} className='h-[150px]' />

        <Label htmlFor='answer' >Ответ</Label>
        <EditStringArray initialStrings={answer.split(', ')} onChange={(strings: any) => { setAnswer(strings.join(', ')) }} />
        <Button onClick={() => { onSave({ topicId, html, answer, id, active, disordered, explanation }); setOpen(false) }}>Сохранить</Button>
      </DialogContent>
    </Dialog>
  )
}
