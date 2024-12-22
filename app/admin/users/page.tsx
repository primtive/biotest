import * as React from 'react';
import UserTable from './table';
import { getUsers } from '@/data/users';

export const metadata = {
  title: 'Список пользователей',
};

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <UserTable users={users} />
  );
}