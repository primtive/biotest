import { requireAdmin } from "@/lib/server/access";
import * as React from 'react';
import UserTable from './users-table';
import { getUsers } from '@/data/users';

export const metadata = {
  title: 'Пользователи',
};

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();
  const groups = Array.from(new Set(users.map((user: any) => user.group).filter(Boolean)));
  return (
    <UserTable users={users} groups={groups} />
  );
}