"use client"
import { ConfirmDelete } from '@/components/confirm-delete';
import { ListFilter } from '@/components/list-filter';
import { PaginationControls, type PaginationProps } from '@/components/pagination-controls';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserBadge } from "@/components/user-badge";
import User from "@/data/models/user";
import { requestJson } from '@/lib/client-request';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable
} from '@tanstack/react-table';
import { CheckCircle, Lock, NotepadText, Pencil, PercentCircle, Trash2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from "react";
import { UserEdit } from "./user-edit";

function multiSelectFilter(
  row: Row<any>, columnId: string, filterValue: any
) {
  return filterValue.includes(String(row.original.group))
}

const UserTable = (data: { users: Array<User>, groups: string[], pagination: PaginationProps, query: { name?: string; username?: string; group?: string } }) => {
  const router = useRouter();
  React.useEffect(() => setUsers(data.users), [data.users]);
  const [users, setUsers] = useState<Array<User>>(data.users);

  const onUserSave = React.useCallback(async (values: { id?: string, name: string, username: string, admin: boolean, isArchive: boolean }) => {
    const publicValues = values;
    const saved = await requestJson<{id: string}>(`/api/users/${values.id || 'new'}`, {
      method: 'POST', body: JSON.stringify(values),
    });
    if (values.id) {
      setUsers(current => current.map(user => user.id === values.id ? { ...user, ...publicValues, id: saved.id } : user));
    }
    router.refresh();
  }, [router]);

  const deleteUser = React.useCallback(async (id: string) => {
    await requestJson(`/api/users/${id}`, { method: 'DELETE' });
    setUsers(current => current.filter(user => user.id !== id));
    router.refresh();
  }, [router]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        header: "Имя пользователя",
        accessorKey: "username",
        cell: ({ row }) => <UserBadge username={row.getValue('username')} />,
      },
      {
        header: "Имя",
        accessorKey: "name",
      },
      {
        header: 'Класс',
        accessorKey: 'group',
        filterFn: multiSelectFilter,
      },
      {
        header: "Группа",
        accessorKey: "topicGroup.name"
      },
      {
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <NotepadText className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Количество пройденных тестов</p>
            </TooltipContent>
          </Tooltip>
        ),
        accessorKey: "testsCount"
      },
      {
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <CheckCircle className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Количество правильно выполненных заданий</p>
            </TooltipContent>
          </Tooltip>
        ),
        accessorKey: "score"
      },
      {
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <PercentCircle className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Процент правильных заданий за последние 10 тестов</p>
            </TooltipContent>
          </Tooltip>
        ),
        accessorKey: "percent"
      },
      {
        accessorKey: "admin",
        header: '',
        cell: ({ row }) => (
          row.getValue('admin') && <Lock className="text-muted-foreground w-5 h-5" />
        ),
      },
      {
        accessorKey: "id",
        header: '',
        cell: ({ row }) => (
          <UserEdit el={<Pencil className="w-5 h-5" />} data={row.original} id={row.getValue('id')} onSave={onUserSave} />
        ),
      },
      {
        accessorKey: "topicGroupId",
        header: '',
        cell: ({ row }) => (
          row.getValue('admin')
            ? <Trash2 className="text-muted-foreground w-5 h-5" />
            : (
              <ConfirmDelete title="Архивировать пользователя?" description="История и результаты сохранятся. Пользователь больше не сможет войти." onDelete={() => deleteUser(row.original.id)}>
                  <Trash2 className="w-5 h-5" />
              </ConfirmDelete>
            )
        ),
      }
    ],
    [onUserSave, deleteUser]
  );

  const table = useReactTable({
    data: users,
    getRowId: user => user.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Пользователи</h1><UserEdit el={<Button>Создать пользователя</Button>} data={{}} onSave={onUserSave} /></div>
      <ListFilter pageSize={data.pagination.pageSize} fields={[{ name: 'name', label: 'Имя', value: data.query.name }, { name: 'username', label: 'Логин', value: data.query.username }]}><label className="space-y-1 text-sm"><span>Группа</span><select name="group" defaultValue={data.query.group || ''} className="block h-9 rounded-md border bg-background px-3"><option value="">Все</option>{data.groups.map(g => <option key={g} value={g}>{g}</option>)}</select></label></ListFilter>

      <TooltipProvider>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className={`${row.original.isArchive ? 'opacity-50' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TooltipProvider>

      <PaginationControls {...data.pagination} />
    </Card>
  );
};

export default UserTable;
