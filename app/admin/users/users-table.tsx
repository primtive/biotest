"use client"
import React, { ReactNode, useMemo, useState } from "react";
import { useTable, useGlobalFilter } from "react-table";
import { CheckCircle, Lock, NotepadText, Pencil, PercentCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
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
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { UserEdit } from "./user-edit";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GlobalFilter = ({ globalFilter, setGlobalFilter }: any) => {
  return (
    <Input
      type="text"
      value={globalFilter || ""}
      onChange={(e) => setGlobalFilter(e.target.value || undefined)}
      placeholder="Имя пользователя | имя"
      style={{ marginBottom: "10px", padding: "8px", width: "100%", background: "var(--background)" }}
    />
  );
};

const UserTable = (data: { users: Array<User> }) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [users, setUsers] = useState<Array<User>>(data.users);

  function onUserSave(values: { id?: string, name: string, username: string }) {
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

  const columns = useMemo(
    () => [
      {
        Header: "Имя пользователя",
        accessor: "username",
      },
      {
        Header: "Имя",
        accessor: "name",
      },
      {
        Header: "Группа",
        accessor: "topicGroup.name"
      },
      {
        Header: () => <Tooltip>
          <TooltipTrigger asChild>
            <NotepadText className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Количество пройденных тестов</p>
          </TooltipContent>
        </Tooltip>,
        accessor: "testsCount"
      },
      {
        Header: () => <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Количество правильно выполненных заданий</p>
          </TooltipContent>
        </Tooltip>,
        accessor: "score"
      },
      {
        Header: () => <Tooltip>
          <TooltipTrigger asChild>
            <PercentCircle className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Процент правильных заданий за последние 10 тестов</p>
          </TooltipContent>
        </Tooltip>,
        accessor: "percent"
      },
      {
        accessor: "admin",
        Cell: ({ row }: any) => (
          row.values.admin && <Lock className="text-muted-foreground w-5 h-5" />
        ),
      },
      {
        accessor: "id",
        Cell: ({ row }: any) => (
          row.values.admin
            ?
            <Pencil className="text-muted-foreground w-5 h-5" />
            :
            <UserEdit el={<Pencil className="w-5 h-5" />} data={row.values} id={row.values.id} onSave={onUserSave} />
        ),
      },
      {
        Cell: ({ row }: any) => (
          row.values.admin
            ?
            <Trash2 className="text-muted-foreground w-5 h-5" />
            :
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
                  <AlertDialogAction onClick={() => deleteUser(row.values.id)}>Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        ),
        accessor: 'topicGroupId'
      }
    ],
    []
  );

  // const data = useMemo(() => users, [users]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    setGlobalFilter: setFilter,
  } = useTable(
    {
      columns,
      data: users
    } as any,
    useGlobalFilter
  );

  React.useEffect(() => {
    setFilter(globalFilter);
  }, [globalFilter, setFilter]);

  return (
    <Card className="w-max max-w-fit">
      <GlobalFilter globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
      <TooltipProvider>
        <Table {...getTableProps()}>
          <TableHeader>
            {headerGroups.map((headerGroup: any, i) => {
              const { key, props } = headerGroup.getHeaderGroupProps();
              return <TableRow key={key} {...props}>
                {headerGroup.headers.map((column: any, j: number) => {
                  const { key, props } = column.getHeaderProps();
                  return <TableHead key={key} {...props}>
                    {column.render("Header")}
                  </TableHead>
                })}
              </TableRow>
            })}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {rows.map((row: any) => {
              prepareRow(row);
              const { key, props } = row.getRowProps();
              return (
                <TableRow key={key} {...props}>
                  {row.cells.map((cell: any, j: number) => {
                    const { key_, props } = cell.getCellProps();
                    return <TableCell key={key_} {...props}>
                      {cell.render("Cell")}
                    </TableCell>
                  })}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8}>
                <UserEdit className="w-full" el={<a className={cn("w-full", buttonVariants({ variant: "default" }))}>Создать</a>} data={{}} onSave={onUserSave} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TooltipProvider>
    </Card>
  );
};

export default UserTable;