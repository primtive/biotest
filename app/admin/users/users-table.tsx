"use client"
import React, { useMemo, useState } from "react";
import { CheckCircle, Lock, NotepadText, Pencil, PercentCircle, Trash2, ChevronLeft, ChevronRight, Group } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card";
import User from "@/data/models/user";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserEdit } from "./user-edit";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserBadge } from "@/components/user-badge";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  ColumnFiltersState,
  Row,
} from '@tanstack/react-table';
import { GroupSelect } from "./group-select";

function multiSelectFilter(
  row: Row<any>, columnId: string, filterValue: any
) {
  return filterValue.includes(String(row.original.group))
}

const UserTable = (data: { users: Array<User>, groups: string[] }) => {
  const [nameFilter, setNameFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<User>>(data.users);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  function onUserSave(values: { id?: string, name: string, username: string, admin: boolean, isArchive: boolean }) {
    if (values.id) {
      fetch(`/api/users/${values.id}`, {
        method: 'POST',
        body: JSON.stringify(values)
      })
      const userIndex = users.findIndex(u => u.id == values.id!)
      if (userIndex !== -1) {
        const newUsers = [...users];
        newUsers[userIndex] = { ...users[userIndex], ...values };
        setUsers(newUsers);
      }
    } else {
      fetch(`/api/users/new`, {
        method: 'POST',
        body: JSON.stringify(values)
      }).then(x => x.json()).then(res => {
        setUsers([...users, { ...values, id: res.id }]);
      })
    }
  }

  function deleteUser(id: string) {
    fetch(`/api/users/${id}`, {
      method: 'DELETE'
    })
    setUsers([...users].filter(u => u.id != id));
  }

  React.useEffect(() => {
    const newFilters = [];
    if (nameFilter) {
      newFilters.push({
        id: 'name',
        value: nameFilter
      });
    }
    if (usernameFilter) {
      newFilters.push({
        id: 'username',
        value: usernameFilter
      });
    }
    if (selectedGroups.length > 0) {
      newFilters.push({
        id: 'group',
        value: selectedGroups
      });
    }
    setColumnFilters(newFilters);
  }, [nameFilter, usernameFilter, selectedGroups]);

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
        id: 'group',
        accessor: 'group',
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
          row.getValue('admin')
            ? <Pencil className="text-muted-foreground w-5 h-5" />
            : <UserEdit el={<Pencil className="w-5 h-5" />} data={row.original} id={row.getValue('id')} onSave={onUserSave} />
        ),
      },
      {
        accessorKey: "topicGroupId",
        header: '',
        cell: ({ row }) => (
          row.getValue('admin')
            ? <Trash2 className="text-muted-foreground w-5 h-5" />
            : (
              <AlertDialog>
                <AlertDialogTrigger className="cursor-pointer" asChild>
                  <Trash2 className="w-5 h-5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Все данные о прохождении тестов будут удалены
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteUser(row.getValue('id'))}>
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
        ),
      }
    ],
    []
  );

  const table = useReactTable({
    data: users,
    columns,
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <Card className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Фильтр по имени"
          className="w-full"
        />
        <Input
          type="text"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
          placeholder="Фильтр по имени пользователя"
          className="w-full"
        />
        <UserEdit
          className="w-full"
          el={<Button className="w-full">Создать пользователя</Button>}
          data={{}}
          onSave={onUserSave}
        />
      </div>

      {GroupSelect(data.groups, selectedGroups, setSelectedGroups)}

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

      {/* Pagination Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Показано {table.getRowModel().rows.length} из {users.length} пользователей
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex w-[50px] items-center justify-center text-sm font-medium">
              {table.getState().pagination.pageIndex + 1} из{' '}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Показать {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserTable;