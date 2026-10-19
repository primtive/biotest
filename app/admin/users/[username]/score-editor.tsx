'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestJson, errorMessage } from '@/lib/client-request';
export function ScoreEditor({ userId }: { userId: string }) {
  const [score, setScore] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const key = useRef<string | null>(null); const router = useRouter();
  async function save() { const value = Number(score); if (!score || !Number.isSafeInteger(value) || Math.abs(value) > 1000000) { setError('Укажите целое число от −1000000 до 1000000'); return; } setPending(true); setError(''); key.current ||= crypto.randomUUID(); try { await requestJson(`/api/scores/${userId}`, { method: 'POST', body: JSON.stringify({ score: value, requestId: key.current }) }); key.current = null; setScore(''); router.refresh(); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  return <div className="my-3 space-y-2"><div className="flex gap-2"><Input type="number" aria-label="Корректировка очков" value={score} onChange={e => { setScore(e.target.value); key.current = null; }} disabled={pending} /><Button onClick={save} disabled={pending}>Скорректировать</Button></div>{error && <p role="alert">{error}</p>}</div>;
}
