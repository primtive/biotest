import { Eye } from 'lucide-react';
import Link from 'next/link';
export const ReviewTest = ({ testId }: { testId: string }) => <Link href={`/t/${testId}/review`} prefetch={false} aria-label="Просмотр теста" title="Просмотр теста" className="inline-flex"><Eye className="w-5 h-5" /></Link>;
