import { buttonVariants } from '@/components/ui/button';
import * as React from 'react';

export const metadata = {
    title: 'Страница не найдена',
};

export default function notFound() {
    return (
        <>
            <p>Страница не найдена</p>
            <a href='/' className={buttonVariants()}>На главную</a>
        </>
    );
}