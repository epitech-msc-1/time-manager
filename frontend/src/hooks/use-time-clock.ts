import { useMutation, useQuery } from "@apollo/client/react";
import type { GraphQLError } from "graphql";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CLOCK_IN_MUTATION, CLOCK_OUT_MUTATION } from "@/graphql/mutations";
import { GET_TIME_CLOCK_STATUS } from "@/graphql/queries";

interface TimeClockEntry {
    id: string;
    day: string;
    clockIn: string | null;
    clockOut: string | null;
}

interface TimeClockData {
    timeClock: TimeClockEntry | null;
}

interface TimeClockVariables {
    userId: string;
}

interface ClockInData {
    clockIn: {
        timeClock: TimeClockEntry;
    };
}

interface ClockOutData {
    clockOut: {
        timeClock: TimeClockEntry;
    };
}

type TimeClockStatus = "not-clocked-in" | "clocked-in" | "clocked-out";

type GraphQLErrorCarrier = {
    graphQLErrors: readonly GraphQLError[];
};

function hasGraphQLErrors(error: unknown): error is GraphQLErrorCarrier {
    return (
        typeof error === "object" &&
        error !== null &&
        "graphQLErrors" in error &&
        Array.isArray((error as Record<string, unknown>).graphQLErrors)
    );
}

function isNoEntryError(error: unknown) {
    if (!hasGraphQLErrors(error)) {
        return false;
    }

    return error.graphQLErrors.some((graphQLError) =>
        graphQLError.message.toLowerCase().includes("no entry"),
    );
}

function extractErrorMessage(error: unknown) {
    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") {
            return message;
        }
    }

    return "An error occurred.";
}

function formatClockMoment(entry: TimeClockEntry, key: "clockIn" | "clockOut") {
    const timeValue = entry[key];

    if (!timeValue) {
        return null;
    }

    const isoString = `${entry.day}T${timeValue}`;
    const parsed = new Date(isoString);

    if (Number.isNaN(parsed.getTime())) {
        return timeValue;
    }

    return parsed.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function useTimeClock(userId?: string) {
    const [timeClock, setTimeClock] = useState<TimeClockEntry | null>(null);

    const {
        loading: statusLoading,
        refetch,
        data,
        error,
    } = useQuery<TimeClockData, TimeClockVariables>(GET_TIME_CLOCK_STATUS, {
        variables: { userId: userId ?? "" },
        skip: !userId,
        fetchPolicy: "network-only",
    });

    useEffect(() => {
        if (!data) {
            if (!statusLoading && !error) {
                setTimeClock(null);
            }
            return;
        }

        setTimeClock(data.timeClock ?? null);
    }, [data, error, statusLoading]);

    useEffect(() => {
        if (!error) {
            return;
        }

        if (isNoEntryError(error)) {
            setTimeClock(null);
            return;
        }

        const message = extractErrorMessage(error);
        console.error("Failed to fetch time clock status:", error);
        toast.error("Unable to retrieve your status.", {
            description: message,
        });
    }, [error]);

    const [runClockIn, { loading: clockInLoading }] = useMutation<ClockInData, TimeClockVariables>(
        CLOCK_IN_MUTATION,
        {
            onCompleted: (data) => {
                const entry = data.clockIn?.timeClock;

                if (entry) {
                    setTimeClock(entry);
                    const formatted = formatClockMoment(entry, "clockIn");
                    toast.success("Clock in confirmed", {
                        description: formatted ? `Entry recorded at ${formatted}` : undefined,
                    });
                }
            },
            onError: (error) => {
                const message = extractErrorMessage(error);
                console.error("Clock in failed:", error);
                toast.error("Clock in failed", {
                    description: message,
                });
            },
        },
    );

    const [runClockOut, { loading: clockOutLoading }] = useMutation<
        ClockOutData,
        TimeClockVariables
    >(CLOCK_OUT_MUTATION, {
        onCompleted: (data) => {
            const entry = data.clockOut?.timeClock;

            if (entry) {
                setTimeClock(entry);
                const formatted = formatClockMoment(entry, "clockOut");
                toast.success("Clock out confirmed", {
                    description: formatted ? `Exit recorded at ${formatted}` : undefined,
                });
            }
        },
        onError: (error) => {
            const message = extractErrorMessage(error);
            console.error("Clock out failed:", error);
            toast.error("Clock out failed", {
                description: message,
            });
        },
    });

    const status: TimeClockStatus = useMemo(() => {
        if (!timeClock) {
            return "not-clocked-in";
        }

        if (timeClock.clockOut) {
            return "clocked-out";
        }

        return "clocked-in";
    }, [timeClock]);

    const clockIn = useCallback(async () => {
        if (!userId) {
            toast.error("User not authenticated");
            return null;
        }

        const result = await runClockIn({ variables: { userId } });
        return result.data?.clockIn.timeClock ?? null;
    }, [runClockIn, userId]);

    const clockOut = useCallback(async () => {
        if (!userId) {
            toast.error("User not authenticated");
            return null;
        }

        const result = await runClockOut({ variables: { userId } });
        return result.data?.clockOut.timeClock ?? null;
    }, [runClockOut, userId]);

    const refreshStatus = useCallback(async () => {
        if (!userId) {
            return null;
        }

        try {
            const result = await refetch({ userId });
            return result.data?.timeClock ?? null;
        } catch (error) {
            console.error("Unable to refresh time clock status:", error);
            return null;
        }
    }, [refetch, userId]);

    return {
        timeClock,
        status,
        clockIn,
        clockOut,
        refreshStatus,
        isStatusLoading: statusLoading,
        isMutating: clockInLoading || clockOutLoading,
    };
}
