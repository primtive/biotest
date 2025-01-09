"use client"
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
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

export const TasksTable = ({topics}: any) => {
  const [data, setData] = useState([]);
  const [pageCount, setPageCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize,] = useState(20);

  const formatHtml = (html: string) => html.replace(/<[^>]*>/g, '').split(' ').slice(0, 8).join(' ') + '...'

  const fetchData = async (pageIndex: number) => {
    // setLoading(true);
    const response = await fetch(`/api/tasks?page_index=${pageIndex}&page_size=${pageSize}`);
    const result = await response.json();

    setData(result.data);
    setPageCount(Math.ceil(result.pagination.total / pageSize));
    setLoading(false);
  };

  useEffect(() => {
    fetchData(pageIndex);
    console.log(pageIndex);
  }, [pageIndex]);

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
        Header: '',
        id: 'edit',
        accessor: (row: any) => <TaskEdit id={row.id} el={<Pencil />} />
      },
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
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Тема" />
            </SelectTrigger>
            <SelectContent className='w-[400px]'>
              <SelectGroup>
                <SelectLabel>Темы</SelectLabel>
                {topics.map((topic: any) => <SelectItem value={topic.id}>{topic.name}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
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
                {pageIndex + 1} из {pageOptions.length}
              </strong>{' '}
            </span>
            <Button onClick={() => handleNext()} disabled={!canNextPage} className='h-min p-2'>
              <ArrowRight />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};