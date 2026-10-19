"use client";
import { ConfirmDelete } from '@/components/confirm-delete';
import { requestJson } from '@/lib/client-request';
import { useQueryClient } from '@tanstack/react-query';

import { MultiSelect } from '@/components/multi-select';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { AlertCircle, Check, Pencil, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { TaskEdit } from './task-edit';
import { useTaskFilters } from './use-filters';
import { useTasks } from './use-tasks';

export const TasksTable = ({ initData }: { initData: { sources: any, topics: any } }) => {
  const { data, isPending, isFetching, error } = useTasks();
  const queryClient = useQueryClient();
  const { filters, setFilter } = useTaskFilters();
  const [line, setLine] = useState(filters.line);
  useEffect(() => setLine(filters.line), [filters.line]);
  useEffect(() => {
    if (line === filters.line) return;
    const timer = setTimeout(() => setFilter('line', line), 350);
    return () => clearTimeout(timer);
  }, [line, filters.line, setFilter]);

  const saveTask = React.useCallback(async (values: any) => {
    await requestJson(`/api/tasks/${values.id || 'new'}`, { method: 'POST', body: JSON.stringify(values) });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }, [queryClient]);
  const deleteTask = React.useCallback(async (id: string) => {
    await requestJson(`/api/tasks/${id}`, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }, [queryClient]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: 'Линия',
        accessorKey: 'line',
      },
      {
        header: 'Источник',
        accessorKey: 'source',
      },
      {
        header: 'Тема',
        accessorKey: 'topic.name',
      },
      {
        header: 'Ответ',
        accessorKey: 'answer',
      },
      {
        accessorKey: 'isReported',
        header: '',
        cell: ({ row }) => (
          row.getValue('isReported') && <AlertCircle />
        ),
      },
      {
        header: '',
        accessorKey: 'active',
        cell: ({ row }) => (
          row.getValue('active') ? <Check /> : <X />
        ),
      },
      {
        header: '',
        accessorKey: 'id',
        cell: ({ row }) => (
          <TaskEdit
            topics={initData.topics}
            data={row.original}
            onSave={saveTask}
            id={row.getValue('id')}
            el={<Pencil className="w-5 h-5" />}
          />
        ),
      },
      {
        header: '',
        accessorKey: 'delete',
        cell: ({ row }) => (
          <ConfirmDelete title="Выключить задание?" description="Задание исчезнет из новых тестов. История сохранится." onDelete={() => deleteTask(row.original.id)}><Trash2 className="w-5 h-5" /></ConfirmDelete>
        ),
      }
    ],
    [initData.topics, saveTask, deleteTask]
  );

  const table = useReactTable({
    data: data?.items ?? [],
    getRowId: row => row.id,
    columns,
    pageCount: data?.totalPages || 1,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      {isPending && <p>Загрузка…</p>}
      {error && <p role="alert">{error.message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiSelect
          options={initData.topics.map((topic: any) => ({ value: topic.id, label: topic.name }))}
          value={filters.topics}
          onValueChange={(values) => setFilter('topics', values)}
          placeholder="Выберите темы"
          variant="inverted"
          animation={2}
          maxCount={3}
          className='mb-3'
        />
        <MultiSelect
          options={initData.sources.map((source: string) => ({ value: source, label: source }))}
          value={filters.sources}
          onValueChange={(values) => setFilter('sources', values)}
          placeholder="Выберите источники"
          variant="inverted"
          animation={2}
          maxCount={3}
          className='mb-3'
        />
      </div>
      <Input
        type="text"
        value={line}
        onChange={(e) => setLine(e.target.value)}
        placeholder="Линия задания"
        className="w-full"
      />
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
              <TableRow key={row.id}>
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

      <PaginationControls page={data?.page || filters.page} pageSize={data?.pageSize || 20} total={data?.total || 0} totalPages={data?.totalPages || 1} loading={isFetching} />
      <div>
        <TaskEdit
          topics={initData.topics}
          el={<Button>Создать</Button>}
          onSave={saveTask}
          data={{ answer: '' }}
        />
      </div>
    </Card>
  );
};
