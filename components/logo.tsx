import * as React from 'react';
import { Bitter } from 'next/font/google';

const bitter = Bitter({
  subsets: ['cyrillic'],
  weight: '500'
})

export const Logo = () => {
  return (
    <div className='w-full'>
      <a href='/'>
        <p className={`${bitter.className} text-4xl text-center`}>Биотест</p>
      </a>
    </div>
  )
}
