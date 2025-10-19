import { useQuery } from "@apollo/client/react";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
    ChartAreaInteractive,
    type ChartAreaInteractiveDatum,
} from "@/components/chart-bar-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { User } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { GET_KPI_CLOCK, GET_USER_TEAM_PRESENCE } from "@/graphql/queries";

interface DailyTotal {
    day: string;
    totalHours: number;
    totalSeconds: number;
}

interface KpiClockMetrics {
    totalSeconds: number;
    totalHours: number;
    averageHoursPerDay: number;
    averageHoursPerWorkday: number;
    presenceRate: number;
    workedDays: number;
    periodDays: number;
    previousTotalSeconds: number;
    previousTotalHours: number;
    previousPresenceRate: number;
    previousAverageHoursPerWorkday: number;
    dailyTotals: DailyTotal[];
}

interface KpiClockQueryResult {
    kpiClock: KpiClockMetrics | null;
}

interface TeamMemberSnapshot {
    id: string;
    firstname: string;
    lastname: string;
    status: string;
    presence: boolean;
    score: number | null;
}

interface UserTeamPresenceQueryResult {
    userTeamPresence: TeamMemberSnapshot[];
}

type DashboardTimeRange = "7d" | "30d" | "90d";

interface TeamMemberOption {
    id: string;
    label: string;
    description?: string | null;
    initials: string;
}

interface KpiClockQueryVariables {
    period: number;
    userId?: string | null;
}

const composeName = (...segments: Array<string | null | undefined>) =>
    segments
        .map((segment) => segment?.trim())
        .filter((segment): segment is string => Boolean(segment && segment.length > 0))
        .join(" ");

const computeInitials = (first?: string | null, last?: string | null) => {
    const letters = [first, last]
        .map((value) => value?.trim().charAt(0))
        .filter((char): char is string => Boolean(char));

    if (letters.length === 0) {
        return "?";
    }

    return letters.join("").toUpperCase();
};

const buildAuthUserOption = (authUser: User): TeamMemberOption => {
    const label = composeName(authUser.firstName, authUser.lastName) || authUser.email;
    let description: string | null = "Team member";

    if (authUser.isAdmin) {
        description = "Administrator";
    } else if (authUser.isManager) {
        description = "Manager";
    }

    return {
        id: authUser.id,
        label,
        description,
        initials: computeInitials(authUser.firstName, authUser.lastName),
    };
};

const buildTeamSnapshotOption = (member: TeamMemberSnapshot): TeamMemberOption => {
    const label = composeName(member.firstname, member.lastname) || member.id;

    return {
        id: member.id,
        label,
        description: member.status || "Team member",
        initials: computeInitials(member.firstname, member.lastname),
    };
};

const PERIOD_BY_RANGE: Record<DashboardTimeRange, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
};

export default function Page() {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState<DashboardTimeRange>("7d");
    const [viewedUserId, setViewedUserId] = useState<string | null>(user?.id ?? null);

    useEffect(() => {
        if (user?.id) {
            setViewedUserId((current) => current ?? user.id);
            return;
        }

        setViewedUserId(null);
    }, [user?.id]);

    const { data, loading, error } = useQuery<KpiClockQueryResult, KpiClockQueryVariables>(
        GET_KPI_CLOCK,
        {
            variables: {
                period: PERIOD_BY_RANGE[timeRange],
                userId: viewedUserId ?? undefined,
            },
            skip: !user || !viewedUserId,
            fetchPolicy: "cache-and-network",
        },
    );

    const metrics = data?.kpiClock ?? null;

    const {
        data: teamData,
        loading: teamLoading,
        error: teamError,
        refetch: refetchTeamPresence,
    } = useQuery<UserTeamPresenceQueryResult>(GET_USER_TEAM_PRESENCE, {
        variables: {
            period: PERIOD_BY_RANGE[timeRange],
        },
        skip: !user,
        fetchPolicy: "cache-and-network",
    });

    const authUserOption = useMemo(() => {
        if (!user) {
            return null;
        }

        return buildAuthUserOption(user);
    }, [user]);

    const teamMemberOptions = useMemo(() => {
        const options = new Map<string, TeamMemberOption>();

        if (authUserOption) {
            options.set(authUserOption.id, authUserOption);
        }

        const members = teamData?.userTeamPresence ?? [];

        for (const member of members) {
            const option = buildTeamSnapshotOption(member);
            options.set(option.id, option);
        }

        return Array.from(options.values());
    }, [authUserOption, teamData?.userTeamPresence]);

    const teamRows = useMemo(() => {
        const members = teamData?.userTeamPresence ?? [];

        return members.map((member, index) => {
            const numericId = Number.parseInt(member.id, 10);
            const scoreValue = typeof member.score === "number" ? member.score : 0;

            return {
                id: Number.isNaN(numericId) ? index : numericId,
                firstname: member.firstname,
                lastname: member.lastname,
                status: member.status,
                presence: Boolean(member.presence),
                score: scoreValue,
            };
        });
    }, [teamData?.userTeamPresence]);

    const selectedMemberOption = useMemo(() => {
        if (!viewedUserId) {
            return null;
        }

        return teamMemberOptions.find((option) => option.id === viewedUserId) ?? null;
    }, [teamMemberOptions, viewedUserId]);

    const headerUserOption = useMemo(() => {
        if (selectedMemberOption) {
            return selectedMemberOption;
        }

        if (authUserOption) {
            return authUserOption;
        }

        return teamMemberOptions[0] ?? null;
    }, [authUserOption, selectedMemberOption, teamMemberOptions]);

    const chartData = useMemo<ChartAreaInteractiveDatum[]>(() => {
        const totals = metrics?.dailyTotals ?? [];

        return totals.map((item) => ({
            day: item.day,
            totalHours: item.totalHours,
            totalSeconds: item.totalSeconds,
        }));
    }, [metrics?.dailyTotals]);

    const managerRow = useMemo(() => {
        if (!user || !teamData?.userTeamPresence) {
            return null;
        }

        return teamData.userTeamPresence.find(
            (member) => member.status === "Manager" && member.id === user.id,
        );
    }, [teamData?.userTeamPresence, user]);

    const isManager = Boolean(user?.isManager || managerRow);
    const canManageMembers = Boolean(user?.isAdmin || isManager);
    const targetTeamId = user?.teamManagedId ?? user?.teamId ?? null;

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        if (!canManageMembers) {
            if (viewedUserId !== user.id) {
                setViewedUserId(user.id);
            }
            return;
        }

        if (!viewedUserId) {
            setViewedUserId(user.id);
            return;
        }

        if (teamMemberOptions.length === 0) {
            return;
        }

        const exists = teamMemberOptions.some((option) => option.id === viewedUserId);

        if (!exists) {
            const fallbackId =
                teamMemberOptions.find((option) => option.id === user.id)?.id ??
                teamMemberOptions[0].id;
            setViewedUserId(fallbackId);
        }
    }, [canManageMembers, teamMemberOptions, user?.id, viewedUserId]);

    const handleViewedUserChange = useCallback((nextUserId: string) => {
        setViewedUserId((current) => (current === nextUserId ? current : nextUserId));
    }, []);

    const handleTeamRefresh = useCallback(async () => {
        await refetchTeamPresence();
    }, [refetchTeamPresence]);

    const handleTimeRangeChange = useCallback((value: DashboardTimeRange) => {
        setTimeRange(value);
    }, []);

    const isUserSelectorDisabled = teamLoading && teamMemberOptions.length <= 1;

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader
                    selectedUser={headerUserOption}
                    userOptions={teamMemberOptions}
                    canSelectUser={canManageMembers}
                    onUserSelect={handleViewedUserChange}
                    isUserSelectorDisabled={isUserSelectorDisabled}
                />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <SectionCards
                                metrics={metrics ?? undefined}
                                isLoading={loading}
                                periodKey={timeRange}
                            />
                            <div className="px-4 lg:px-6">
                                <ChartAreaInteractive
                                    data={chartData}
                                    timeRange={timeRange}
                                    onTimeRangeChange={handleTimeRangeChange}
                                    isLoading={loading}
                                />
                            </div>
                            <DataTable
                                data={teamRows}
                                isLoading={teamLoading}
                                canManageMembers={canManageMembers}
                                teamId={targetTeamId}
                                onTeamUpdated={handleTeamRefresh}
                                currentUserIsAdmin={Boolean(user?.isAdmin)}
                            />
                            {error ? (
                                <p className="px-4 text-sm text-destructive lg:px-6">
                                    Failed to load KPI data: {error.message}
                                </p>
                            ) : null}
                            {teamError ? (
                                <p className="px-4 text-sm text-destructive lg:px-6">
                                    Failed to load team data: {teamError.message}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
