import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function ListFilter({ fields, pageSize = 20, children }: { fields: Array<{ name: string; label: string; value?: string }>; pageSize?: number; children?: React.ReactNode }) {
  return <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/40 p-3"><input type="hidden" name="pageSize" value={pageSize} />{fields.map(field => <label key={field.name} className="min-w-36 flex-1 space-y-1 text-sm"><span>{field.label}</span><Input name={field.name} defaultValue={field.value} maxLength={160} /></label>)}{children}<Button type="submit" variant="secondary">Найти</Button></form>;
}
