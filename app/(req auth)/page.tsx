import { Leaderboard } from '@/components/leaderboard';
import Home from './home';
import prisma from '@/data/prisma';
import { getCurrentUser } from '@/lib/server/access';
import { getLeaderboard, getUserLastTest, getUserTopicPercentages } from '@/data/users';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
export default async function Index() {
  const user = await getCurrentUser();
  const groups = await prisma.topicGroup.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const [topics, lastTest, percentages, data] = await Promise.all([
    user ? prisma.topic.findMany({ where: { topicGroupId: user.topicGroupId, active: true }, include: { topicGroup: true }, orderBy: [{ section: 'asc' }, { name: 'asc' }] }) : [],
    user ? getUserLastTest(user.id) : null,
    user ? getUserTopicPercentages(user.id) : {},
    Promise.all(groups.map(async group => ({ topicGroupId: group.id, name: group.name, leaderboard: await getLeaderboard(group.id, user?.id) }))),
  ]);
  return <>{user && <>{lastTest && !lastTest.isComplete && <Card className="space-y-3"><p>Вы не закончили прошлый тест!</p><Button asChild variant="secondary"><Link href={`/t/${lastTest.id}`}>Вернуться</Link></Button></Card>}<Home topics={topics} topicGroupId={user.topicGroupId} topicPercentages={percentages} /></>}<Leaderboard data={data} initTopicGroupId={user?.topicGroupId} userId={user?.id} /></>;
}
