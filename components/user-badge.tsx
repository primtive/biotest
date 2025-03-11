import Link from 'next/link';
import * as React from 'react';
import { Badge } from './ui/badge';

export const UserBadge = ({username, name}: {username: string, name?: string}) => {
  return (
    <Link className='' href={`/admin/users/${username}`}><Badge variant={'secondary'}>{name || username}</Badge></Link>
  )
}
