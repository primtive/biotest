"use client";
import { ConfirmDelete } from '@/components/confirm-delete';
import { requestJson } from '@/lib/client-request';

import { ListFilter } from "@/components/list-filter";
import { PaginationControls, type PaginationProps } from "@/components/pagination-controls";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { TopicEdit } from "./topic-edit";

const TopicsTable = ({ initTopics, pagination, query }: { initTopics: Array<any>; pagination: PaginationProps; query: string }) => {
  const [topics, setTopics] = useState<Array<any>>(initTopics);
  const router = useRouter();

  React.useEffect(() => setTopics(initTopics), [initTopics]);
  const topicSave = React.useCallback(async (values: any) => {
    await requestJson(`/api/topics/${values.id || 'new'}`, { method: 'POST', body: JSON.stringify(values) });
    router.refresh();
  }, [router]);
  const deleteTopic = React.useCallback(async (id: string) => {
    await requestJson(`/api/topics/${id}`, { method: 'DELETE' });
    router.refresh();
  }, [router]);

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
        header: "Раздел",
        accessorKey: "section"
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
            <ConfirmDelete title="Выключить тему?" description="История тестов сохранится." onDelete={() => deleteTopic(row.original.id)}><Trash2 className="w-5 h-5" /></ConfirmDelete>
        )
      }
    ],
    [topicSave, deleteTopic]
  );

  const table = useReactTable({
    data: topics,
    getRowId: row => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
  });

  return (
    <Card className="min-w-0 space-y-4">
      <h1 className="text-xl font-semibold">Темы</h1><ListFilter pageSize={pagination.pageSize} fields={[{ name: "q", label: "Название темы", value: query }]} />
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
      <PaginationControls {...pagination} />
    </Card>
  );
};

export default TopicsTable;
