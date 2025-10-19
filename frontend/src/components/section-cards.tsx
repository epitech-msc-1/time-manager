import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TimeRangeLabel = "7d" | "30d" | "90d";

export interface SectionCardsMetrics {
    totalHours: number;
    averageHoursPerDay: number;
    averageHoursPerWorkday: number;
    presenceRate: number;
    workedDays: number;
    periodDays: number;
    previousTotalHours: number;
    previousAverageHoursPerWorkday: number;
    previousPresenceRate: number;
}

interface SectionCardsProps {
    metrics?: SectionCardsMetrics;
    isLoading?: boolean;
    periodKey: TimeRangeLabel;
}

const TIME_RANGE_COPY: Record<TimeRangeLabel, string> = {
    "7d": "last 7 days",
    "30d": "last 30 days",
    "90d": "last 90 days",
};

const formatHoursAndMinutes = (hours?: number) => {
    if (hours === undefined || Number.isNaN(hours)) {
        return "--";
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60);

    return `${wholeHours}h${minutes.toString().padStart(2, "0")}m`;
};

const formatPercentage = (value?: number) => {
    if (value === undefined || Number.isNaN(value)) {
        return "--";
    }

    return `${value.toFixed(1)}%`;
};

const computeDelta = (current?: number, previous?: number) => {
    if (
        current === undefined ||
        previous === undefined ||
        Number.isNaN(current) ||
        Number.isNaN(previous)
    ) {
        return null;
    }

    if (previous === 0) {
        return current === 0 ? 0 : null;
    }

    return ((current - previous) / previous) * 100;
};

const formatDelta = (delta: number | null) => {
    if (delta === null) {
        return "N/A";
    }

    const sign = delta >= 0 ? "+" : "-";
    return `${sign}${Math.abs(delta).toFixed(1)}%`;
};

const getTrendIcon = (delta: number | null) => {
    if (delta === null) {
        return null;
    }

    return delta >= 0 ? IconTrendingUp : IconTrendingDown;
};

export function SectionCards({ metrics, isLoading = false, periodKey }: SectionCardsProps) {
    const totalDelta = computeDelta(metrics?.totalHours, metrics?.previousTotalHours);
    const averageDelta = computeDelta(
        metrics?.averageHoursPerWorkday,
        metrics?.previousAverageHoursPerWorkday,
    );
    const presenceDelta = computeDelta(metrics?.presenceRate, metrics?.previousPresenceRate);

    const TotalTrendIcon = getTrendIcon(totalDelta);
    const AverageTrendIcon = getTrendIcon(averageDelta);
    const PresenceTrendIcon = getTrendIcon(presenceDelta);

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total Work Time</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            formatHoursAndMinutes(metrics?.totalHours)
                        )}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {TotalTrendIcon ? <TotalTrendIcon className="size-4" /> : null}
                            {formatDelta(totalDelta)}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {TotalTrendIcon ? <TotalTrendIcon className="size-4" /> : null}
                        {formatDelta(totalDelta)} vs previous period
                    </div>
                    <div className="text-muted-foreground">
                        {metrics ? `${metrics.workedDays} worked days` : "No data available"}
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Average Daily</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            formatHoursAndMinutes(metrics?.averageHoursPerWorkday)
                        )}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {AverageTrendIcon ? <AverageTrendIcon className="size-4" /> : null}
                            {formatDelta(averageDelta)}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {AverageTrendIcon ? <AverageTrendIcon className="size-4" /> : null}
                        {formatDelta(averageDelta)} vs previous period
                    </div>
                    <div className="text-muted-foreground">per worked day</div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Presence Rate</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            formatPercentage(metrics?.presenceRate)
                        )}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {PresenceTrendIcon ? <PresenceTrendIcon className="size-4" /> : null}
                            {formatDelta(presenceDelta)}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {PresenceTrendIcon ? <PresenceTrendIcon className="size-4" /> : null}
                        {formatDelta(presenceDelta)} vs previous period
                    </div>
                    <div className="text-muted-foreground">
                        {metrics
                            ? `${metrics.workedDays}/${metrics.periodDays} days ${TIME_RANGE_COPY[periodKey]}`
                            : "No data available"}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
