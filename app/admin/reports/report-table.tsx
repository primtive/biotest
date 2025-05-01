import * as React from 'react';
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
import { ColumnDef, ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { UserBadge } from "@/components/user-badge";
import { ArrowUpDown, CircleCheck, CircleX } from "lucide-react";
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import topicGroups from "@/data/topicGroups";
import { memo, useState } from 'react';



export type UserReport = {
  name: string,
  username: string,
  testCount: number,
  score: number,
  topicGroup: string,
}

type ReportTableProps = {
  data: UserReport[],
  testGoal: number,
  scoreGoal: number
}

const SortButton = ({ column, text }: { column: any, text: string }) => {
  return <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    className="p-0"
  >
    {text}
    <ArrowUpDown />
  </Button>
}

const GoalValue = ({ value, goal }: { value: number, goal: number }) => {
  const isReached = value >= goal
  return <div className={cn("flex items-center justify-end gap-1", isReached ? 'text-green-500' : 'text-red-500')}>
    {value}
    {isReached ?
      <CircleCheck className="w-4 h-4" />
      :
      <CircleX className="w-4 h-4" />}
  </div>
}

const ReportTable = memo(function ReportTable({ data, testGoal, scoreGoal }: ReportTableProps) {

  const columns: ColumnDef<UserReport>[] = [
    {
      accessorKey: "username",
      header: ({ column }) => <SortButton column={column} text="Имя пользователя" />,
      cell: ({ row }) => <UserBadge username={row.getValue("username")} />
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortButton column={column} text="Имя" />,
      cell: ({ row }) => row.getValue("name")
    },
    {
      accessorKey: "topicGroupId",
      header: "Группа",
      cell: ({ row }) => topicGroups.find(t => t.topicGroupId == (row.getValue("topicGroupId") as any).$oid)?.name
    },
    {
      accessorKey: "testCount",
      header: ({ column }) => <SortButton column={column} text="Тесты" />,
      cell: ({ row }) => <GoalValue value={row.getValue("testCount")} goal={testGoal} />
    },
    {
      accessorKey: "score",
      header: ({ column }) => <SortButton column={column} text="Счет" />,
      cell: ({ row }) => <GoalValue value={row.getValue("score")} goal={scoreGoal} />
    }
  ]

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    []
  )

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters
    },
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {
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
        }
      </TableBody>
    </Table>
  )
})

export default ReportTable