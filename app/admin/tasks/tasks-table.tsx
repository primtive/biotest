"use client"
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Check, Pencil, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTable, usePagination } from 'react-table';
import { TaskEdit } from './task-edit';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from '@/components/multi-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const TasksTable = ({ initTopics }: any) => {
  const [data, setData] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize,] = useState(20);
  const [topics, setTopics] = useState<Array<String>>([]);

  const formatHtml = (html: string) => html.replace(/<[^>]*>/g, '').split(' ').slice(0, 8).join(' ') + '...'

  const fetchData = async (pageIndex: number) => {
    // setLoading(true);
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

  const columns = React.useMemo(
    () => [
      {
        Header: 'Задание',
        accessor: (row: any) => <div /* className='truncate w-20' */ dangerouslySetInnerHTML={{ __html: formatHtml(row.html) }}></div>,
      },
      {
        Header: 'Тема',
        id: 'topic',
        accessor: (row: any) => row.topic.name,
      },
      {
        Header: 'Ответ',
        accessor: 'answer',
      },
      {
        accessor: (row: any) => (row.active
          ?
          <Check />
          :
          <X />
        ),
        id: 'active'
      },
      {
        Header: '',
        id: 'id',
        accessor: (row: any) => <TaskEdit topics={initTopics} data={row} onSave={saveTask} id={row.id} el={<Pencil className="w-5 h-5" />} />
      },
      {
        id: 'delete',
        accessor: (row: any) => <AlertDialog>
          <AlertDialogTrigger className="cursor-pointer" asChild>
            <Trash2 className="w-5 h-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить задание?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTask(row.id)}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      pageCount,
      initialState: { pageIndex: 0 },
    },
    usePagination
  );

  const handleNext = () => {
    nextPage()
    setPageIndex(prevPage => prevPage + 1);
  };

  const handlePrev = () => {
    previousPage()
    setPageIndex(prevPage => Math.max(prevPage - 1, 1)); // Не позволяйте странице быть меньше 1
  };

  return (
    <Card>
      <MultiSelect
        options={initTopics.map((topic: any) => ({ value: topic.id, label: topic.name }))}
        onValueChange={(values) => {
          setPageIndex(0)
          setTopics(values)
        }}
        // defaultValue={field.value}
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
          <Table {...getTableProps()}>
            <TableHeader>
              {headerGroups.map(headerGroup => (
                <TableRow {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <TableHead {...column.getHeaderProps()}>
                      {column.render('Header')}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody {...getTableBodyProps()}>
              {rows.map(row => {
                prepareRow(row);
                return (
                  <TableRow {...row.getRowProps()}>
                    {row.cells.map(cell => (
                      <TableCell {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className='flex items-center gap-3'>
            <Button onClick={() => handlePrev()} disabled={!canPreviousPage} className='h-min p-2'>
              <ArrowLeft />
            </Button>
            <span>
              Страница{' '}
              <strong>
                {pageIndex + 1} из {pageCount}
              </strong>{' '}
            </span>
            <Button onClick={() => handleNext()} disabled={!canNextPage} className='h-min p-2'>
              <ArrowRight />
            </Button>
            <TaskEdit topics={initTopics} el={<Button>Создать</Button>} onSave={saveTask} data={{ answer: '' }} />
          </div>
        </>
      )}
    </Card>
  );
};