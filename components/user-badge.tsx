import Link from 'next/link';
import * as React from 'react';
import { Badge } from './ui/badge';

export const UserBadge = ({username, name}: {username: string, name?: string}) => {
  return (
    <Link prefetch={false} className='' href={`/admin/users/${encodeURIComponent(username)}`}><Badge variant={'secondary'}>{name || username}</Badge></Link>
  )
}
