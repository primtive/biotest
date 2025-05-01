"use client"
import React, { ReactNode, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { Check, CheckCircle, Lock, NotepadText, Pencil, PercentCircle, Trash, Trash2, X } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { TopicEdit } from "./topic-edit";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

const GlobalFilter = ({ globalFilter, setGlobalFilter }: { globalFilter: string, setGlobalFilter: (value: string) => void }) => {
  return (
    <Input
      type="text"
      value={globalFilter || ""}
      onChange={(e) => setGlobalFilter(e.target.value)}
      placeholder="Название темы"
      style={{ marginBottom: "10px", padding: "8px", width: "100%", background: "var(--background)" }}
    />
  );
};

const TopicsTable = ({ initTopics }: { initTopics: Array<any> }) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [topics, setTopics] = useState<Array<any>>(initTopics);
  const router = useRouter();

  function topicSave(values: any) {
    if (values.id) {
      fetch(`/api/topics/${values.id}`, {
        method: 'POST',
        body: JSON.stringify(values)
      }).then(x => {
        if (x.status == 200) window.location.reload()
        else alert(x.statusText)
      })
    } else {
      fetch(`/api/topics/new`, {
        method: 'POST',
        body: JSON.stringify(values)
      }).then(x => {
        if (x.status == 200) window.location.reload()
        else alert(x.statusText)
      })
    }
  }

  function deleteTopic(id: string) {
    fetch(`/api/topics/${id}`, {
      method: 'DELETE'
    }).then(x => window.location.reload())
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Название темы",
        accessorKey: "name",
      },
      {
        header: "Группа",
        accessorKey: "topicGroup.name",
      },
      {
        header: "Кол-во",
        accessorKey: "count",
      },
      {
        accessorKey: 'active',
        header: '',
        cell: ({ row }) => (
          row.getValue('active')
            ?
            <Check className="w-5 h-5" />
            :
            <X className="w-5 h-5" />
        )
      },
      {
        accessorKey: "id",
        header: '',
        cell: ({ row }) => (
          <TopicEdit el={<Pencil className="w-5 h-5" />} data={row.original} id={row.getValue('id')} onSave={topicSave} />
        ),
      },
      {
        accessorKey: "topicGroupId",
        header: '',
        cell: ({ row }) => (
          row.getValue('count') != 0
            ?
            <Trash2 className="text-muted-foreground w-5 h-5" />
            :
            <AlertDialog>
              <AlertDialogTrigger className="cursor-pointer" asChild>
                <Trash2 className="w-5 h-5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить тему?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTopic(row.getValue('id'))}>Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: topics,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <Card className="max-w-[800px] mx-auto">
      <GlobalFilter globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
      <TooltipProvider>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8}>
                <TopicEdit className="w-full" el={<a className={cn("w-full", buttonVariants({ variant: "default" }))}>Создать</a>} data={{ topicGroupId: '67962669e4f21c30e05aef8b' }} onSave={topicSave} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TooltipProvider>
    </Card>
  );
};

export default TopicsTable;