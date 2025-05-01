"use client"
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Check, Pencil, Trash2, X } from 'lucide-react';
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

export const TasksTable = ({ initTopics }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize,] = useState(20);
  const [topics, setTopics] = useState<Array<string>>([]);

  const formatHtml = (html: string) => html.replace(/<[^>]*>/g, '').split(' ').slice(0, 8).join(' ') + '...'

  const fetchData = async (pageIndex: number) => {
    const response = await fetch(`/api/tasks?page_index=${pageIndex}&page_size=${pageSize}&topics=${topics.join(',')}`);
    const result = await response.json();

    setData(result.data);
    setPageCount(Math.ceil(result.pagination.total / pageSize));
    setLoading(false);
  };

  const saveTask = async (values: any) => {
    const response = await fetch(`/api/tasks/${(values.id || 'new')}`, {
      method: "POST",
      body: JSON.stringify(values)
    });
    if (response.status == 200) {
      fetchData(pageIndex)
    }
    else {
      alert('Ошибка ' + response.statusText)
    }
  }

  function deleteTask(id: string) {
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    }).then(x => fetchData(pageIndex))
  }

  useEffect(() => {
    fetchData(pageIndex);
  }, [pageIndex, topics]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: 'Задание',
        cell: ({ row }) => (
          <div dangerouslySetInnerHTML={{ __html: formatHtml(row.original.html) }} />
        ),
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
        header: 'Активен',
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
            topics={initTopics} 
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
          <AlertDialog>
            <AlertDialogTrigger className="cursor-pointer" asChild>
              <Trash2 className="w-5 h-5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить задание?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTask(row.getValue('id'))}>
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ),
      }
    ],
    [initTopics]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex, pageSize });
        setPageIndex(newState.pageIndex);
      }
    },
  });

  const handleNext = () => {
    table.nextPage();
    setPageIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    table.previousPage();
    setPageIndex(prev => Math.max(prev - 1, 0));
  };

  return (
    <Card>
      <MultiSelect
        options={initTopics.map((topic: any) => ({ value: topic.id, label: topic.name }))}
        onValueChange={(values) => {
          setPageIndex(0);
          setTopics(values);
        }}
        placeholder="Выберите темы"
        variant="inverted"
        animation={2}
        maxCount={3}
        className='mb-3'
      />
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <>
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
              onClick={() => handlePrev()} 
              disabled={!table.getCanPreviousPage()} 
              className='h-min p-2'
            >
              <ArrowLeft />
            </Button>
            <span>
              Страница{' '}
              <strong>
                {pageIndex + 1} из {pageCount}
              </strong>{' '}
            </span>
            <Button 
              onClick={() => handleNext()} 
              disabled={!table.getCanNextPage()} 
              className='h-min p-2'
            >
              <ArrowRight />
            </Button>
            <TaskEdit 
              topics={initTopics} 
              el={<Button>Создать</Button>} 
              onSave={saveTask} 
              data={{ answer: '' }} 
            />
          </div>
        </>
      )}
    </Card>
  );
};