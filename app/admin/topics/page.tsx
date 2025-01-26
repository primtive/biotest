import * as React from 'react';
import prisma from "@/data/prisma";
import TopicsTable from './topics-table';

export const metadata = {
  title: 'Темы',
};

export default async function UsersPage() {
  const aggr: any = await prisma.task.aggregateRaw({
    pipeline: [
      {
        $group: {
          _id: "$topicId",
          count: { $sum: 1 }
        }
      }
    ]
  })
  const topics = (await prisma.topic.findMany({ include: { topicGroup: true } }))
    .map(topic => ({ ...topic, count: aggr.find?.((x: any) => x._id['$oid'] == topic.id)?.count || 0 }))
  return (
    <TopicsTable initTopics={topics} />
  );
}