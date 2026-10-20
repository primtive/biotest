'use client';
import { AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserBadge } from '@/components/user-badge';

type Reporter = { id: string; username: string | null; name: string };
export function TaskReporters({ isReported, reporters }: { isReported: boolean; reporters: Reporter[] }) {
  if (!isReported && !reporters.length) return null;
  return <Popover>
    <PopoverTrigger asChild><button type="button" aria-label="Отправители жалоб" title="Отправители жалоб" className={`inline-flex items-center gap-1 ${isReported ? 'text-destructive' : 'text-muted-foreground'}`}><AlertCircle className="h-5 w-5" /><span className="text-xs tabular-nums">{reporters.length}</span></button></PopoverTrigger>
    <PopoverContent className="max-h-72 overflow-y-auto space-y-3"><h3 className="text-sm font-medium">Отправители жалоб</h3>
      {!reporters.length && <p className="text-sm text-muted-foreground">Отправитель не указан</p>}
      {reporters.map(user => <div key={user.id} className="space-y-1">{user.username && <UserBadge username={user.username} />}<p className="text-sm text-muted-foreground">{user.name}</p></div>)}
    </PopoverContent>
  </Popover>;
}
