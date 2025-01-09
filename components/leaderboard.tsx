import * as React from 'react';
import { Card } from './ui/card';
import { getLeaderboard } from '@/data/users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

export const Leaderboard = async () => {
  const leaderboard = await getLeaderboard()
  return (
    <>
      <Card>
        <p className='text-center'>Топ по очкам</p>
        <Table>
          <TableHeader>
            <TableHead></TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Очки</TableHead>
          </TableHeader>
          <TableBody>
            {leaderboard.map((user: any, i: number) => {
              let color;
              switch (i) {
                case 0:
                  color = 'text-yellow-500 font-bold'
                  break;
                case 1:
                  color = 'text-gray-400 font-bold'
                  break;
                case 2:
                  color = 'text-yellow-700 font-bold'
                  break;
                default:
                  color = ''
              }
              return <TableRow>
                <TableCell className={cn(color)}>{i + 1}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.score}</TableCell>
              </TableRow>
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
