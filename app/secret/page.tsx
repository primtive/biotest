import authOptions from '@/auth';
import topicGroups from '@/data/topicGroups';
import { getLeaderboard } from '@/data/users';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import * as React from 'react';
import { FullLeaderboard } from './full-leaderboard';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Секретные функции',
};

export default async function SecretPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) return redirect('/')
  if (!['678017cadefdce0d7375bf07', '6784f9d99bbfbb23d367b5e0'].includes(session?.user?.id)) return redirect('/')

  const topicGroupId = session?.user?.topicGroupId
  const data = await Promise.all(topicGroups.map(async topicGroup => {
    const data = await getLeaderboard(topicGroup.topicGroupId);
    return {
      ...topicGroup,
      leaderboard: data
    }
  }))

  return (
    <div className='space-y-3'>
      <Card>Пикми тема скоро будет...</Card>
      <FullLeaderboard data={data} initTopicGroupId={topicGroupId} userId={session?.user?.id} />
    </div>
  );
}