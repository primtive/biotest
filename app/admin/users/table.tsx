"use client"
import React, { useMemo, useState } from "react";
import { useTable, useGlobalFilter } from "react-table";
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
import User from "@/data/models/user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GlobalFilter = ({ globalFilter, setGlobalFilter }: any) => {
  return (
    <Input
      type="text"
      value={globalFilter || ""}
      onChange={(e) => setGlobalFilter(e.target.value || undefined)}
      placeholder="Имя пользователя | имя"
      style={{ marginBottom: "10px", padding: "8px", width: "100%", background: "var(--background)" }}
    />
  );
};

const UserTable = ({ users }: { users: Array<User> }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      {
        Header: "Имя",
        accessor: "name",
      },
      {
        Header: "Имя пользователя",
        accessor: "username",
      },
      {
        Header: "Пароль",
        accessor: "password",
      },
    ],
    []
  );

  const data = useMemo(() => users, [users]);

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
      data,
    } as any,
    useGlobalFilter
  );

  // Sync state with the external search box
  React.useEffect(() => {
    setFilter(globalFilter);
  }, [globalFilter, setFilter]);

  return (
    <Card>
      <GlobalFilter globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
      <Table {...getTableProps()}>
        <TableHeader>
          {headerGroups.map((headerGroup: any, i) => {
            const { key, props } = headerGroup.getHeaderGroupProps();
            return <TableRow key={key} {...props}>
              {headerGroup.headers.map((column: any, j: number) => {
                const { key_, props_ } = column.getHeaderProps();
                return <TableHead key={key_} {...props_}>
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
                {row.cells.map((cell: any, j: number) => (
                  <TableCell key={j} {...cell.getCellProps()}>
                    {cell.render("Cell")}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>
              <Button className="w-full">Создать</Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
};

export default UserTable;