"use client";
import { useQueryClient } from '@tanstack/react-query';
import { requestJson } from '@/lib/client-request';
import { ConfirmDelete } from '@/components/confirm-delete';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Pencil, Trash2, X } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { TaskEdit } from './task-edit';
import { MultiSelect } from '@/components/multi-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTasks } from './use-tasks';
import { useTaskFilters } from './use-filters';
import { Input } from '@/components/ui/input';

export const TasksTable = ({ initData }: { initData: { sources: any, topics: any } }) => {
  const { data, isPending, error } = useTasks();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const { filters, setFilter } = useTaskFilters();

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
    pageCount: Math.ceil((data?.total ?? 0) / 20),
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
        value={filters.line}
        onChange={(e) => setFilter('line', e.target.value)}
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

      <div className='flex items-center gap-3'>
        <Button
          onClick={() => setFilter('page', Math.max(filters.page - 1, 1))}
          disabled={filters.page <= 1}
          className='h-min p-2'
        >
          <ArrowLeft />
        </Button>
        <span>
          Страница{' '}
          <strong>
            {filters.page} из {data?.totalPages}
          </strong>{' '}
        </span>
        <Button
          onClick={() => setFilter('page', Math.min(filters.page + 1, data?.totalPages))}
          disabled={filters.page >= data?.totalPages}
          className='h-min p-2'
        >
          <ArrowRight />
        </Button>
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