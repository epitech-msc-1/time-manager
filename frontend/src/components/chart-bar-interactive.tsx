"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export const description = "An interactive area chart";

const chartConfig = {
    workedHours: {
        label: "Worked Hours",
    },
    hours: {
        label: "Hours",
        color: "var(--primary)",
    },
} satisfies ChartConfig;

type TimeRangeKey = "7d" | "30d" | "90d";

export interface ChartAreaInteractiveDatum {
    day: string;
    totalHours: number;
    totalSeconds: number;
}

interface ChartAreaInteractiveProps {
    data: ChartAreaInteractiveDatum[];
    timeRange: TimeRangeKey;
    onTimeRangeChange: (value: TimeRangeKey) => void;
    isLoading?: boolean;
}

const getTimeRangeLabel = (range: TimeRangeKey) => {
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

export function ChartAreaInteractive({
    data,
    timeRange,
    onTimeRangeChange,
    isLoading = false,
}: ChartAreaInteractiveProps) {
    const isMobile = useIsMobile();

    React.useEffect(() => {
        if (isMobile && timeRange !== "7d") {
            onTimeRangeChange("7d");
        }
    }, [isMobile, onTimeRangeChange, timeRange]);

    const sortedData = React.useMemo(() => {
        return [...data]
            .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
            .map((item) => ({
                date: item.day,
                hours: Number.isFinite(item.totalHours) ? Number(item.totalHours.toFixed(2)) : 0,
                totalSeconds: item.totalSeconds,
            }));
    }, [data]);

    const handleTimeRangeChange = React.useCallback(
        (value: string) => {
            if (!value) {
                return;
            }
            onTimeRangeChange(value as TimeRangeKey);
        },
        [onTimeRangeChange],
    );

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Total Worked Time</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Total worked time for the {getTimeRangeLabel(timeRange)}
                    </span>
                    <span className="@[540px]/card:hidden">{getTimeRangeLabel(timeRange)}</span>
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={handleTimeRangeChange}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
                    >
                        <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
                        <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
                        <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={handleTimeRangeChange}>
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
                {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                        <BarChart
                            accessibilityLayer
                            data={sortedData}
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
                                            return new Date(value).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                weekday: "long",
                                            });
                                        }}
                                        valueFormatter={(value, payload) => {
                                            const data = payload as
                                                | { totalSeconds: number }
                                                | undefined;
                                            const hours = value as number;

                                            // Prefer totalSeconds if available for better precision
                                            const totalSeconds =
                                                data?.totalSeconds ?? Math.round(hours * 3600);

                                            const totalMinutes = Math.round(totalSeconds / 60);
                                            const h = Math.floor(totalMinutes / 60);
                                            const m = totalMinutes % 60;

                                            if (h === 0) {
                                                return `${m}min`;
                                            }
                                            return `${h}h ${m}min`;
                                        }}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Bar dataKey="hours" fill="var(--color-hours)" radius={8} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
