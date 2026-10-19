export const STATISTICS_TIMEZONE = "Europe/Moscow";
const DAY = 86_400_000;

export type StatisticsRange = { from: string; to: string; start: Date; end: Date };

export function dateInMoscow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STATISTICS_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map(key => parts.find(part => part.type === key)!.value).join("-");
}

export function parseMoscowDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("Укажите дату в формате ГГГГ-ММ-ДД");
  const date = new Date(`${value}T00:00:00+03:00`);
  if (!Number.isFinite(date.valueOf()) || dateInMoscow(date) !== value) throw new RangeError("Указана несуществующая дата");
  return date;
}

export function statisticsRange(from?: string, to?: string): StatisticsRange {
  const today = parseMoscowDate(dateInMoscow());
  const weekday = new Date(today.valueOf() + 3 * 3_600_000).getUTCDay();
  const defaultFrom = new Date(today.valueOf() - ((weekday + 6) % 7 + 11 * 7) * DAY);
  const first = from || dateInMoscow(defaultFrom);
  const last = to || dateInMoscow(today);
  const start = parseMoscowDate(first);
  const lastStart = parseMoscowDate(last);
  if (start > lastStart) throw new RangeError("Начало периода должно быть не позже окончания");
  if (lastStart.valueOf() - start.valueOf() > 3660 * DAY) throw new RangeError("Выберите период не более 10 лет");
  return { from: first, to: last, start, end: new Date(lastStart.valueOf() + DAY) };
}

export function weekKeys(range: StatisticsRange) {
  const shifted = new Date(range.start.valueOf() + 3 * 3_600_000);
  shifted.setUTCDate(shifted.getUTCDate() - (shifted.getUTCDay() + 6) % 7);
  const keys: string[] = [];
  for (let date = shifted.valueOf(); date < range.end.valueOf() + 3 * 3_600_000; date += 7 * DAY) {
    keys.push(new Date(date).toISOString().slice(0, 10));
  }
  return keys;
}

export function formatMoscowDate(date: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: STATISTICS_TIMEZONE, dateStyle: "medium", timeStyle: "short",
  }).format(new Date(date));
}

export function formatDuration(createdAt: Date, completedAt: Date | null) {
  if (!completedAt) return "Не пройден";
  const seconds = Math.max(0, Math.floor((completedAt.valueOf() - createdAt.valueOf()) / 1000));
  const hours = Math.floor(seconds / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function uniqueTestAnswers<T extends { taskId: string; correct: boolean }>(test: { tasksIds: string[]; answers: T[] }) {
  const included = new Set(test.tasksIds);
  const seen = new Set<string>();
  return test.answers.filter(answer => {
    if (!included.has(answer.taskId) || seen.has(answer.taskId)) return false;
    seen.add(answer.taskId);
    return true;
  });
}

// Historical duplicate submissions must not inflate reports. Keep the first
// submitted answer and the correctness recorded at that time; never regrade it.
export const uniqueAnswersExpression = {
  $reduce: {
    input: { $ifNull: ["$answers", []] }, initialValue: [],
    in: {
      $cond: [
        { $and: [
          { $in: ["$$this.taskId", { $ifNull: ["$tasksIds", []] }] },
          { $not: [{ $in: ["$$this.taskId", { $map: { input: "$$value", as: "answer", in: "$$answer.taskId" } }] }] },
        ] },
        { $concatArrays: ["$$value", ["$$this"]] }, "$$value",
      ],
    },
  },
};
