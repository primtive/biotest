"use client"
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import { addDays, format } from "date-fns"
import { ru } from "date-fns/locale/ru";
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from 'usehooks-ts'
import ReportTable, { UserReport } from "./report-table";

type ReportData = {
  data: UserReport[],
  from: string,
  to: string,
}

interface DateRange {
  from: Date;
  to: Date;
}



const Reports = () => {

  const [period, setPeriod] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

  const [report, setReport] = useState<ReportData>()
  const [topicGroup, setTopicGroup] = useState<string>('all')
  const [mode, setMode] = useState<string>('week')
  const [isPending, setPending] = useState(false)
  // const [completedOnly, setCompletedOnly] = useState<boolean>(true);

  const getDateRange = (range: string): DateRange => {
    const now = new Date(); // или dayjs() если используете dayjs
    let from: Date;
    let to: Date;

    switch (range) {
      case 'week': // Прошедшая неделя (пн-вс)
        const lastSunday = new Date(now);
        lastSunday.setDate(now.getDate() - now.getDay()); // Переход на прошлое воскресенье
        const lastMonday = new Date(lastSunday);
        lastMonday.setDate(lastSunday.getDate() - 6);

        from = lastMonday;
        to = lastSunday;
        break;

      case 'month': // Прошедший месяц
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        from = firstDayOfLastMonth;
        to = lastDayOfLastMonth;
        break;

      case '7d': // Последние 7 дней
        from = new Date(now);
        from.setDate(now.getDate() - 6); // Включая сегодня
        to = new Date(now);
        break;

      case '30d': // Последние 30 дней
        from = new Date(now);
        from.setDate(now.getDate() - 29); // Включая сегодня
        to = new Date(now);
        break;

      default:
        from = new Date(now);
        to = new Date(now);
    }

    return { from, to };
  };

  useEffect(() => {
    if (mode !== 'custom') {
      setPeriod(getDateRange(mode))
    }
  }, [mode])

  function getData() {
    setPending(true)

    if (!period) {
      toast.error('Выберите даты')
      return
    }

    // fetch(`/api/reports?from=${moment(period.from).format('YYYY-MM-DD')}&to=${moment(period.to).format('YYYY-MM-DD')}&topicGroup=${topicGroup}&completedOnly=${completedOnly}`)
    fetch(`/api/reports?from=${moment(period.from).format('YYYY-MM-DD')}&to=${moment(period.to).format('YYYY-MM-DD')}&topicGroup=${topicGroup}`)
      .then(x => x.json()).then(res => {
        setPending(false)
        if (res.message) {
          toast.error(res.message)
          return
        }
        setReport(res)
      })
  }

  const [scoreGoal, setScoreGoal] = useLocalStorage<number>('scoreGoal', 0)
  const [testGoal, setTestGoal] = useLocalStorage<number>('testGoal', 0)



  return (
    <Card className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <Calendar
            locale={ru}
            initialFocus
            mode="range"
            defaultMonth={period?.from}
            selected={period}
            onSelect={(period) => {
              setPeriod({ from: period?.from!, to: period?.to! })
              setMode('custom')
            }}
            numberOfMonths={1}
            className="p-0 m-auto w-min md:m-0"
          />
        </div>
        <div className="flex flex-wrap flex-col gap-3">
          <Select name="topicGroup" onValueChange={setTopicGroup} value={topicGroup} >
            <SelectTrigger>
              <SelectValue placeholder="Выберите группу" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">ОГЭ / ЕГЭ</SelectItem>
                <SelectItem value="oge">ОГЭ</SelectItem>
                <SelectItem value="ege">ЕГЭ</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select name="mode" onValueChange={setMode} value={mode}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите режим" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="week">Прошедшая неделя</SelectItem>
                <SelectItem value="month">Прошедший месяц</SelectItem>
                <SelectItem value="7d">Последние 7 дней</SelectItem>
                <SelectItem value="30d">Последние 30 дней</SelectItem>
                <SelectItem value="custom">Выбрать даты</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {/* <div className="flex items-center gap-3"> */}
          {/* <Checkbox id="completed-only" onCheckedChange={(v) => setCompletedOnly(Boolean(v))} checked={completedOnly} /> */}
          {/* <Label htmlFor="completed-only">Только завершенные тесты</Label> */}
          {/* </div> */}
          <Button onClick={getData} variant={"secondary"} disabled={isPending}>Сформировать</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 justify-center content-center items-center w-fit">
          <Label htmlFor="test-count" className="text-right">Норма тестов</Label>
          <Input id="test-count" type="number" value={testGoal} onChange={(e) => setTestGoal(parseInt(e.target.value))} />
          <Label htmlFor="score-count" className="text-right">Норма счета</Label>
          <Input id="score-count" type="number" value={scoreGoal} onChange={(e) => setScoreGoal(parseInt(e.target.value))} />
        </div>
      </div>
      {report && <p className="p-2">Отчет {format(report.from, 'd MMM', { locale: ru })} - {format(report.to, 'd MMM', { locale: ru })}</p>}
      {/* <ScrollArea className="w-full flex h-[600px] "> */}
      {report ?
        <>
          <ReportTable data={report.data} scoreGoal={scoreGoal} testGoal={testGoal} />
        </>
        :
        isPending ?
          <Skeleton className="w-full" />
          :
          <div className="w-full" />
      }
      {/* </ScrollArea> */}
    </Card >
  );
};

export default Reports;