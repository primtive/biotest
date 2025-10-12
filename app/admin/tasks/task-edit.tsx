import * as React from 'react';
import {
  Dialog,
  DialogContent,
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
  const [line, setLine] = React.useState(data?.line)
  const [source, setSource] = React.useState(data?.source)
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
      <DialogContent className='gap-3'>
        <DialogHeader>
          <DialogTitle>Изменить задание <p className='text-sm text-muted-foreground'>(ID: {data?.id})</p></DialogTitle>
          {/* <DialogDescription> ! Пока не работает !</DialogDescription> */}
        </DialogHeader>
        <div className='flex items-center gap-5'>
          <div className='flex gap-2'>
            <Checkbox id='active' checked={active} onCheckedChange={(val) => setActive(val)}></Checkbox>
            <Label htmlFor='active'>Включить</Label>
          </div>
          <div className='flex gap-2'>
            <Checkbox id='disordered' checked={disordered} onCheckedChange={(val) => setDisordered(val)}></Checkbox>
            <Label htmlFor='disordered'>Неупорядоченное</Label>
          </div>
        </div>

        <div className='flex items-center gap-5'>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='line'>Линия</Label>
            <Input id='line' value={line} onChange={(e) => setLine(e.target.value)} />
          </div>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='source'>Источник</Label>
            <Input id='source' value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>

        <div className='space-y-1'>
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
        </div>

        <div className='space-y-1'>
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
        </div>

        <div className='space-y-1'>
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
        </div>

        <div className='space-y-1'>
          <Label htmlFor='answer' >Ответ</Label>
          <EditStringArray initialStrings={answer.split(', ')} onChange={(strings: any) => { setAnswer(strings.join(', ')) }} />
        </div>
        <Button onClick={() => { onSave({ topicId, html, answer, line, source, id, active, disordered, explanation, isReported: false }); setOpen(false) }}>Сохранить</Button>
      </DialogContent>
    </Dialog>
  )
}
