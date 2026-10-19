export function normalizeAnswer(value: string) { return value.toLocaleLowerCase('ru-RU').replace(/\s/gu, ''); }
export function checkAnswer(correct: string, submitted: string, disordered: boolean) {
  const answer = normalizeAnswer(submitted);
  if (!answer) return false;
  const equal = (value: string) => disordered
    ? [...normalizeAnswer(value)].sort().join('') === [...answer].sort().join('')
    : normalizeAnswer(value) === answer;
  return correct.split(/,\s+/u).some(equal) || equal(correct);
}
export function uniqueAnswers<T extends { taskId: unknown; correct: boolean }>(tasksIds: unknown[], answers: T[] = []): T[] {
  const selected = new Set(tasksIds.map(String)); const seen = new Set<string>();
  return answers.filter(answer => { const id = String(answer.taskId); if (!selected.has(id) || seen.has(id)) return false; seen.add(id); return true; });
}
