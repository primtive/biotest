import * as React from 'react';
import { Nunito } from 'next/font/google';
import Leaf from '@/public/leaf.svg'
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const nunito = Nunito({subsets: ['cyrillic'], weight: '800'})

export const Logo = ({className, ...props}: {className?: string}) => {
  return (
      <Link href='/' className={cn('flex items-center gap-8 w-fit', className)} {...props}>
        <Image src={Leaf} alt='' className='w-[40px] fill-current text-primary  ' />
        <p className={`${nunito.className} text-3xl text-center select-none`}>Оренбио</p>
      </Link>
  )
}
