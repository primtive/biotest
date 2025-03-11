import { Eye } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

export const ReviewTest = ({ testId }: { testId: string }) => {
  return (
    <Link href={`/t/${testId}/review`}><Eye className='w-5 h-5' /></Link>
  )
}
