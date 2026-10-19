'use client';
import {useTheme} from 'next-themes';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {requestJson} from '@/lib/client-request';
type RealtimeContextType={isEnabled:boolean;toggle:()=>Promise<void>};
const RealtimeContext=createContext<RealtimeContextType|null>(null);
export function RealtimeProvider({children}:{children:React.ReactNode}){
 const [isEnabled,setIsEnabled]=useState(false);const {setTheme,resolvedTheme}=useTheme();const previousTheme=useRef<string>('light');const theme=useRef(resolvedTheme);theme.current=resolvedTheme;
 useEffect(()=>{const source=new EventSource('/api/events');source.onmessage=e=>{try{const data=JSON.parse(e.data);if(typeof data.isEnabled!=='boolean')return;setIsEnabled(data.isEnabled);if(data.isEnabled){if(theme.current&&theme.current!=='pink')previousTheme.current=theme.current;setTheme('pink');}else if(theme.current==='pink')setTheme(previousTheme.current);}catch{}};return()=>source.close();},[setTheme]);
 return <RealtimeContext.Provider value={{isEnabled,toggle:async()=>{await requestJson('/api/events',{method:'POST'});}}}>{children}</RealtimeContext.Provider>;
}
export function useRealtime(){const ctx=useContext(RealtimeContext);if(!ctx)throw new Error('RealtimeProvider missing');return ctx;}
