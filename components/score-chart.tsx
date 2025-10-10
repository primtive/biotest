"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, LineChart, Tooltip, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import moment from "moment"
import 'moment/locale/ru'

moment.locale('ru');

const chartConfig = {
  score: {
    label: "Правильных заданий",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ScoreChart({ data }: { data: any }) {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart accessibilityLayer data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="weekDate"
          interval={1}
        // tickFormatter={(date) => moment(date).format('DD MMM')}
        />
        <YAxis domain={[0, 10]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {/* <ChartLegend content={<ChartLegendContent />} /> */}
        <Area
          dataKey="score"
          type="natural"
          fill="var(--color-score)"
          stroke="var(--color-score)"
          name="Правильных заданий" />
      </AreaChart>
    </ChartContainer>
  )
}
