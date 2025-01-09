import * as React from 'react';
import UserTable from './users-table';
import { getUsers } from '@/data/users';

export const metadata = {
  title: 'Пользователи',
};

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <UserTable users={users} />
  );
}