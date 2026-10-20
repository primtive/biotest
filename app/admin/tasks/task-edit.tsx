'use client';
import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import EditStringArray from '@/components/string-list-edit';
import { errorMessage } from '@/lib/client-request';
const empty={active:true,disordered:false,line:'',source:'',topicId:'',html:'',explanation:'',answer:''};
function HtmlPreview({ html, title }: { html: string; title: string }) {
 return <Dialog>
  <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />{title}</Button></DialogTrigger>
  <DialogContent aria-describedby={undefined} className="max-h-[85vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto">
   <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
   <iframe title={title} sandbox="" srcDoc={html} className="h-[60vh] min-h-80 w-full rounded-md border bg-white" />
  </DialogContent>
 </Dialog>;
}
export function TaskEdit({data, id, onSave, el, topics, className}: {data?: any; id?: string; onSave:(values:any)=>Promise<void>; el:ReactNode; topics:any[]; className?:string}) {
 const [open,setOpen]=useState(false); const [pending,setPending]=useState(false); const [error,setError]=useState(''); const uid=useId();

 const [values,setValues]=useState(empty);
 useEffect(()=>{if(open){setValues(Object.fromEntries(Object.entries(empty).map(([key, value]) => [key, data?.[key] ?? value])) as typeof empty);setError('');}},[open,id,data]);
 const field=(key:keyof typeof empty,value:string|boolean)=>setValues(v=>({...v,[key]:value}));
 async function save(e:React.FormEvent){e.preventDefault();if(pending)return;setPending(true);setError('');try{await onSave({...values,id,isReported:false});setOpen(false);}catch(e){setError(errorMessage(e));}finally{setPending(false);}}
 return <Dialog open={open} onOpenChange={value=>{if(!pending)setOpen(value);}}><DialogTrigger asChild><span role="button" tabIndex={0} className={className}>{el}</span></DialogTrigger><DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{id?'Изменить задание':'Создать задание'}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3"><label><input type="checkbox" checked={values.active} disabled={pending} onChange={e=>field('active',e.target.checked)}/> Включить</label><label className="ml-3"><input type="checkbox" checked={values.disordered} disabled={pending} onChange={e=>field('disordered',e.target.checked)}/> Неупорядоченный ответ</label>{(['line','source'] as const).map(key=><label key={key} className="block" htmlFor={`${uid}-${key}`}>{key==='line'?'Линия':'Источник'}<Input id={`${uid}-${key}`} disabled={pending} value={values[key]} onChange={e=>field(key,e.target.value)}/></label>)}<label className="block">Тема<select className="block w-full border rounded p-2 bg-background" required disabled={pending} value={values.topicId} onChange={e=>field('topicId',e.target.value)}><option value="">Выберите тему</option>{topics.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{(['html','explanation'] as const).map(key=><div key={key} className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={`${uid}-${key}`}>{key==='html'?'HTML задания':'HTML пояснения'}</label><HtmlPreview html={values[key]} title={key==='html'?'Предпросмотр задания':'Предпросмотр пояснения'} /></div><Textarea id={`${uid}-${key}`} disabled={pending} value={values[key]} onChange={e=>field(key,e.target.value)}/></div>)}<label className="block">Варианты правильного ответа</label><EditStringArray initialStrings={values.answer.split(', ')} onChange={a=>field('answer',a.join(', '))}/>{error&&<p role="alert">{error}</p>}<Button disabled={pending} type="submit">{pending?'Сохранение…':'Сохранить'}</Button></form></DialogContent></Dialog>;
}
