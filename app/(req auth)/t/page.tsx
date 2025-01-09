import * as React from 'react';
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth';
import { newRandomTest, newTestWithTopics } from '@/data/tests';
import authOptions from '@/auth';

export const metadata = {
  title: '',
};

export default async function Test({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await getServerSession(authOptions)
  const query = (await searchParams)

  const userId = session?.user!.name || '';
  var testId;

  if (query.topics) {
    const topicIds = query.topics.split(',')
    testId = await newTestWithTopics(topicIds, userId)
  } else {
    testId = await newRandomTest(userId)
  }
  redirect(`/t/${testId}`)
}