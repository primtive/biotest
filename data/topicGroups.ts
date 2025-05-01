export type TopicGroup = {
  topicGroupId: string,
  name: string
}

const topicGroups: TopicGroup[] = [
  { topicGroupId: '67962ae5e4f21c30e05aef91', name: 'ОГЭ' },
  { topicGroupId: '67962669e4f21c30e05aef8b', name: 'ЕГЭ' },
]

export const topicGroupIds: Record<string, string> = {
  'ОГЭ': '67962ae5e4f21c30e05aef91',
  'ЕГЭ': '67962669e4f21c30e05aef8b'
}

export default topicGroups