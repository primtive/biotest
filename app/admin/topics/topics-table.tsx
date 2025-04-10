"use client"
import React, { ReactNode, useMemo, useState } from "react";
import { useTable, useGlobalFilter } from "react-table";
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

const GlobalFilter = ({ globalFilter, setGlobalFilter }: any) => {
  return (
    <Input
      type="text"
      value={globalFilter || ""}
      onChange={(e) => setGlobalFilter(e.target.value || undefined)}
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
      // const topicIndex = topics.findIndex(u => u.id == values.id!)
      // if (topicIndex !== -1) {
      // const newTopics = [...topics];
      // newTopics[topicIndex] = { ...topics[topicIndex], ...values };
      // setTopics(newTopics);
      // }
    } else {
      fetch(`/api/topics/new`, {
        method: 'POST',
        body: JSON.stringify(values)
      }).then(x => {
        if (x.status == 200) window.location.reload()
        else alert(x.statusText)
      })
      // .then(x => x.json()).then(res => {
      //   setTopics([...topics, { ...values, id: res.id }]);
      // })
    }
  }

  function deleteTopic(id: string) {
    fetch(`/api/topics/${id}`, {
      method: 'DELETE'
    }).then(x => window.location.reload())
  }

  const columns = useMemo(
    () => [
      {
        Header: "Название темы",
        accessor: "name",
      },
      {
        Header: "Группа",
        accessor: "topicGroup.name",
      },
      {
        Header: "Кол-во",
        accessor: "count",
      },
      {
        accessor: 'active',
        Cell: ({ row }: any) => (
          row.values.active
            ?
            <Check className="w-5 h-5" />
            :
            <X className="w-5 h-5" />
        )
      },
      {
        accessor: "id",
        Cell: ({ row }: any) => (
          <TopicEdit el={<Pencil className="w-5 h-5" />} data={row.values} id={row.values.id} onSave={topicSave} />
        ),
      },
      {
        accessor: "topicGroupId",
        Cell: ({ row }: any) => (
          row.values.count != 0
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
                  <AlertDialogAction onClick={() => deleteTopic(row.values.id)}>Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )
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
    state,
    setGlobalFilter: setFilter,
  } = useTable(
    {
      columns,
      data: topics
    } as any,
    useGlobalFilter
  );

  React.useEffect(() => {
    setFilter(globalFilter);
  }, [globalFilter, setFilter]);

  return (
    <Card className="max-w-[800px] mx-auto">
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
                    return <TableCell key={key_} {...props} className="">
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