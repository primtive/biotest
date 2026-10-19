import { requireUser, secretUserIds } from "@/lib/server/access";
import authOptions from '@/auth';
import topicGroups from '@/data/topicGroups';
import { getLeaderboard } from '@/data/users';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import * as React from 'react';
import { FullLeaderboard } from './full-leaderboard';
import SecretButton from '@/components/secret-button';

export const metadata = {
  title: 'Секретные функции',
};

export default async function SecretPage() {
  const user = await requireUser();
  if (!secretUserIds.includes(user.id)) redirect('/');
  const session = { user };

  const topicGroupId = session?.user?.topicGroupId
  const data = await Promise.all(topicGroups.map(async topicGroup => {
    const data = await getLeaderboard(topicGroup.topicGroupId, user.id, true);
    return {
      ...topicGroup,
      leaderboard: data
    }
  }))

  return (
    <div className='space-y-3'>
      <SecretButton />
      <FullLeaderboard data={data} initTopicGroupId={topicGroupId} userId={session?.user?.id} />
    </div>
  );
}