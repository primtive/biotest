import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { UserBadge } from "@/components/user-badge";
import topicGroups from "@/data/topicGroups";
import { cn } from "@/lib/utils";
import { ColumnDef, ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { ArrowUpDown, CircleCheck, CircleX } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter(), params = useSearchParams();
  return <Button variant="ghost" className="p-0" onClick={() => {
    const query = new URLSearchParams(params.toString());
    query.set('direction', params.get('sort') === column.id && params.get('direction') !== 'asc' ? 'asc' : 'desc');
    query.set('sort', column.id); query.set('page', '1');
    router.replace(`?${query}`, { scroll: false });
  }}>{text}<ArrowUpDown /></Button>;
};

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
    manualSorting: true,
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
