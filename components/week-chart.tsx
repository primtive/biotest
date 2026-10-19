"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import moment from "moment"
import 'moment/locale/ru'

moment.locale('ru');

const chartConfig = {
  count: {
    label: "Все тесты",
    color: "var(--chart-1)",
  },
  countCompleted: {
    label: "Завершенные тесты",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function WeekChart({ data }: { data: any }) {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="weekDate"
          interval="preserveStartEnd"
          minTickGap={32}
        // tickFormatter={(date) => moment(date).format('DD MMM')}
        />
        <YAxis allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {/* <ChartLegend content={<ChartLegendContent />} /> */}
        <Area
          dataKey="count"
          type="natural"
          fill="var(--color-count)"
          stroke="var(--color-count)"
          name="Все тесты" />
        <Area
          dataKey="countCompleted"
          type="natural"
          fill="var(--color-countCompleted)"
          stroke="var(--color-countCompleted)"
          name="Завершенные тесты" />
      </AreaChart>
    </ChartContainer>
  )
}
