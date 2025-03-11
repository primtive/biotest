"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, LineChart, Tooltip, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import moment from "moment"
import 'moment/locale/ru'

moment.locale('ru');

interface WeekAggregation {
  weekDate: Date;
  count: number;
}

function groupTestsByWeek(tests: any[]): WeekAggregation[] {
  const grouped: { [key: string]: WeekAggregation } = {};

  tests.forEach((test) => {
    const weekStart = getWeekStartDate(test.createdAt);
    const weekKey = weekStart.toISOString();
    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekDate: weekStart,
        count: 0,
      };
    }
    grouped[weekKey].count++;
  });
  return Object.values(grouped).sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime());
}

function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}


const chartConfig = {
  count: {
    label: "Число прохождений",
    color: "#23614B",
  },
} satisfies ChartConfig

export function Chart({ data }: { data: any }) {

  const groupedTests = groupTestsByWeek(data);

  const chartData = groupedTests.map((item) => ({
    weekDate: item.weekDate.toLocaleDateString(),
    count: item.count,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="weekDate"
          interval={1}
          tickFormatter={(date) => moment(date).format('DD MMM')} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="count"
          type="natural"
          fill="var(--color-count)"
          stroke="var(--color-count)"
          name="Число прохождений" />
      </AreaChart>
    </ChartContainer>
  )
}
