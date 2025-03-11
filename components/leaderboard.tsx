import * as React from 'react';
import { Card } from './ui/card';
import { getLeaderboard } from '@/data/users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

export const Leaderboard = async ({ topicGroupId, name, userId }: { topicGroupId: string, name: string, userId: string }) => {
  const leaderboard: Array<any> = await getLeaderboard(topicGroupId);
  const filteredLeaderboard = leaderboard.filter((x: any) => x.score != 0).filter((x: any, i: any) => i < 10)
  if (!filteredLeaderboard.find(x => x._id.$oid == userId)) {
    const user = leaderboard.find(x => x._id.$oid == userId)
    if (user) filteredLeaderboard.push({ ...user, index: leaderboard.indexOf(user) })
  }
  return (
    <>
      <Card>
        <p className='text-center'>{name}</p>
        <Table>
          <TableHeader>
            <TableHead></TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Очки</TableHead>
          </TableHeader>
          <TableBody>
            {filteredLeaderboard.map((user: any, i: number) => {
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
                <TableCell className={cn(color)}>{user.index || (i + 1)}</TableCell>
                <TableCell className={cn(user._id.$oid == userId ? 'font-bold' : '')}>{user.name}</TableCell>
                <TableCell>{user.score}</TableCell>
              </TableRow>
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
