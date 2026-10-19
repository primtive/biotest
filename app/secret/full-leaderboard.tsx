"use client"

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';


export const FullLeaderboard = ({ data, initTopicGroupId, userId }: { data: Array<any>, initTopicGroupId?: string, userId?: string }) => {
  const [topicGroupId, setTopicGroupId] = React.useState(initTopicGroupId || '67962ae5e4f21c30e05aef91');
  return (
    <>
      <Card>
        <div className='flex items-center justify-between'>
          <p className='text-center w-fit'>Полный топ по очкам</p>
          <ToggleGroup type="single" variant="outline" value={topicGroupId} onValueChange={(val) => { if (val) setTopicGroupId(val) }}>
            <ToggleGroupItem value="67962ae5e4f21c30e05aef91">
              ОГЭ
            </ToggleGroupItem>
            <ToggleGroupItem value="67962669e4f21c30e05aef8b">
              ЕГЭ
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead className='w-20'>Место</TableHead>
              <TableHead className='w-full'>Имя</TableHead>
              <TableHead className='w-30'>Очки</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>

              {data.find(x => x.topicGroupId == topicGroupId).leaderboard.map((user: any, i: number) => {
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
                return <TableRow key={i}>
                  <TableCell className={cn(color)}>{user.index || (i + 1)}</TableCell>
                  <TableCell className={cn(user._id.$oid == userId ? 'font-bold' : '')}>{user.name}</TableCell>
                  <TableCell className=''>{user.score}</TableCell>
                </TableRow>
              })}

            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </>
  )
}
