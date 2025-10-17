"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export const description = "An interactive area chart";

const chartData = [
    { date: "2025-04-01", hours: 222 },
    { date: "2025-04-02", hours: 97 },
    { date: "2025-04-03", hours: 167 },
    { date: "2025-04-04", hours: 242 },
    { date: "2025-04-05", hours: 373 },
    { date: "2025-04-06", hours: 301 },
    { date: "2025-04-07", hours: 245 },
    { date: "2025-04-08", hours: 409 },
    { date: "2025-04-09", hours: 59 },
    { date: "2025-04-10", hours: 261 },
    { date: "2025-04-11", hours: 327 },
    { date: "2025-04-12", hours: 292 },
    { date: "2025-04-13", hours: 342 },
    { date: "2025-04-14", hours: 137 },
    { date: "2025-04-15", hours: 120 },
    { date: "2025-04-16", hours: 138 },
    { date: "2025-04-17", hours: 446 },
    { date: "2025-04-18", hours: 364 },
    { date: "2025-04-19", hours: 243 },
    { date: "2025-04-20", hours: 89 },
    { date: "2025-04-21", hours: 137 },
    { date: "2025-04-22", hours: 224 },
    { date: "2025-04-23", hours: 138 },
    { date: "2025-04-24", hours: 387 },
    { date: "2025-04-25", hours: 215 },
    { date: "2025-04-26", hours: 75 },
    { date: "2025-04-27", hours: 383 },
    { date: "2025-04-28", hours: 122 },
    { date: "2025-04-29", hours: 315 },
    { date: "2025-04-30", hours: 454 },
    { date: "2025-05-01", hours: 165 },
    { date: "2025-05-02", hours: 293 },
    { date: "2025-05-03", hours: 247 },
    { date: "2025-05-04", hours: 385 },
    { date: "2025-05-05", hours: 481 },
    { date: "2025-05-06", hours: 498 },
    { date: "2025-05-07", hours: 388 },
    { date: "2025-05-08", hours: 149 },
    { date: "2025-05-09", hours: 227 },
    { date: "2025-05-10", hours: 293 },
    { date: "2025-05-11", hours: 335 },
    { date: "2025-05-12", hours: 197 },
    { date: "2025-05-13", hours: 197 },
    { date: "2025-05-14", hours: 448 },
    { date: "2025-05-15", hours: 473 },
    { date: "2025-05-16", hours: 338 },
    { date: "2025-05-17", hours: 499 },
    { date: "2025-05-18", hours: 315 },
    { date: "2025-05-19", hours: 235 },
    { date: "2025-05-20", hours: 177 },
    { date: "2025-05-21", hours: 82 },
    { date: "2025-05-22", hours: 81 },
    { date: "2025-05-23", hours: 252 },
    { date: "2025-05-24", hours: 294 },
    { date: "2025-05-25", hours: 201 },
    { date: "2025-05-26", hours: 213 },
    { date: "2025-05-27", hours: 420 },
    { date: "2025-05-28", hours: 233 },
    { date: "2025-05-29", hours: 78 },
    { date: "2025-05-30", hours: 340 },
    { date: "2025-05-31", hours: 178 },
    { date: "2025-06-01", hours: 178 },
    { date: "2025-06-02", hours: 470 },
    { date: "2025-06-03", hours: 103 },
    { date: "2025-06-04", hours: 439 },
    { date: "2025-06-05", hours: 88 },
    { date: "2025-06-06", hours: 294 },
    { date: "2025-06-07", hours: 323 },
    { date: "2025-06-08", hours: 385 },
    { date: "2025-06-09", hours: 438 },
    { date: "2025-06-10", hours: 155 },
    { date: "2025-06-11", hours: 92 },
    { date: "2025-06-12", hours: 492 },
    { date: "2025-06-13", hours: 81 },
    { date: "2025-06-14", hours: 426 },
    { date: "2025-06-15", hours: 307 },
    { date: "2025-06-16", hours: 371 },
    { date: "2025-06-17", hours: 475 },
    { date: "2025-06-18", hours: 107 },
    { date: "2025-06-19", hours: 341 },
    { date: "2025-06-20", hours: 408 },
    { date: "2025-06-21", hours: 169 },
    { date: "2025-06-22", hours: 317 },
    { date: "2025-06-23", hours: 480 },
    { date: "2025-06-24", hours: 132 },
    { date: "2025-06-25", hours: 141 },
    { date: "2025-06-26", hours: 434 },
    { date: "2025-06-27", hours: 448 },
    { date: "2025-06-28", hours: 149 },
    { date: "2025-06-29", hours: 103 },
    { date: "2025-06-30", hours: 446 },
];

const chartConfig = {
    workedHours: {
        label: "Worked Hours",
    },
    hours: {
        label: "Hours",
        color: "var(--primary)",
    },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
    const isMobile = useIsMobile();
    const [timeRange, setTimeRange] = React.useState("7d");

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d");
        }
    }, [isMobile]);

    const getTimeRangeLabel = (range: string) => {
        switch (range) {
            case "7d":
                return "last week";
            case "30d":
                return "last month";
            case "90d":
                return "last 3 months";
            default:
                return "last week";
        }
    };

    const filteredData = chartData.filter((item) => {
        const date = new Date(item.date);
        const referenceDate = new Date("2025-06-30");
        let daysToSubtract = 90;
        if (timeRange === "30d") {
            daysToSubtract = 30;
        } else if (timeRange === "7d") {
            daysToSubtract = 7;
        }
        const startDate = new Date(referenceDate);
        startDate.setDate(startDate.getDate() - daysToSubtract);
        return date >= startDate;
    });

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Total Worked Time</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Total worked time for the {getTimeRangeLabel(timeRange)}
                    </span>
                    <span className="@[540px]/card:hidden">Last 3 months</span>
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={setTimeRange}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
                    >
                        <ToggleGroupItem value="90d">
                            Last 3 months
                        </ToggleGroupItem>
                        <ToggleGroupItem value="30d">
                            Last 30 days
                        </ToggleGroupItem>
                        <ToggleGroupItem value="7d">
                            Last 7 days
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger
                            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                            size="sm"
                            aria-label="Select a value"
                        >
                            <SelectValue placeholder="Last 3 months" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="90d" className="rounded-lg">
                                Last 3 months
                            </SelectItem>
                            <SelectItem value="30d" className="rounded-lg">
                                Last 30 days
                            </SelectItem>
                            <SelectItem value="7d" className="rounded-lg">
                                Last 7 days
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <BarChart
                        accessibilityLayer
                        data={filteredData}
                        margin={{
                            top: 0,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    weekday: "long",
                                });
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(
                                            value
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            weekday: "long",
                                        });
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        <Bar
                            dataKey="hours"
                            fill="var(--color-hours)"
                            radius={8}
                        >
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
