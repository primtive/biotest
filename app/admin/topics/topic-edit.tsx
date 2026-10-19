'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {errorMessage} from '@/lib/client-request';
export function TopicEdit({data,id,onSave,el,className}:{data?:any;id?:string;onSave:(values:any)=>Promise<void>;el:ReactNode;className?:string}){
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');const [v,setV]=useState({name:'',section:'',topicGroupId:'',active:true});
 useEffect(()=>{if(open){setV({name:data?.name||'',section:data?.section||'',topicGroupId:data?.topicGroupId||'',active:data?.active??true});setError('');}},[open,id,data]);
 async function save(e:React.FormEvent){e.preventDefault();setPending(true);setError('');try{await onSave({...v,id});setOpen(false);}catch(e){setError(errorMessage(e));}finally{setPending(false);}}
 return <Dialog open={open} onOpenChange={b=>{if(!pending)setOpen(b);}}><DialogTrigger asChild><span role="button" tabIndex={0} className={className}>{el}</span></DialogTrigger><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>{id?'Изменить тему':'Создать тему'}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3"><label className="block">Название<Input required disabled={pending} value={v.name} onChange={e=>setV({...v,name:e.target.value})}/></label><label className="block">Раздел<Input disabled={pending} value={v.section} onChange={e=>setV({...v,section:e.target.value})}/></label><label className="block">Группа<select required className="block border bg-background p-2" disabled={pending} value={v.topicGroupId} onChange={e=>setV({...v,topicGroupId:e.target.value})}><option value="">Выберите группу</option><option value="67962669e4f21c30e05aef8b">ЕГЭ</option><option value="67962ae5e4f21c30e05aef91">ОГЭ</option></select></label><label><input type="checkbox" disabled={pending} checked={v.active} onChange={e=>setV({...v,active:e.target.checked})}/> Включить</label>{error&&<p role="alert">{error}</p>}<Button type="submit" disabled={pending}>Сохранить</Button></form></DialogContent></Dialog>;
}
