import { type Icon, IconLoader2, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeClock } from "@/hooks/use-time-clock";
import { cn } from "@/lib/utils";

type NavItem = {
    title: string;
    url: string;
    icon?: Icon;
    exact?: boolean;
    disabled?: boolean;
};

export function NavMain({ items }: { items: NavItem[] }) {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { status, isStatusLoading, isMutating, clockIn, clockOut, timeClock } =
        useTimeClock(userId);
    const location = useLocation();

    const isProcessing = isStatusLoading || isMutating;
    const isClockedOut = status === "clocked-out";
    const isClockedIn = status === "clocked-in";

    const buttonLabel = useMemo(() => {
        if (isProcessing) {
            return "Loading";
        }

        if (isClockedIn) {
            return "Clock Out";
        }

        if (isClockedOut) {
            return "Clocked Out";
        }

        return "Clock In";
    }, [isProcessing, isClockedIn, isClockedOut]);

    const buttonIcon = useMemo(() => {
        if (isProcessing) {
            return <IconLoader2 className="size-4 animate-spin" />;
        }

        if (isClockedIn) {
            return <IconPlayerPause className="size-4" />;
        }

        return <IconPlayerPlay className="size-4" />;
    }, [isProcessing, isClockedIn]);

    const buttonClasses = useMemo(
        () =>
            cn(
                "min-w-8 duration-200 ease-linear disabled:cursor-not-allowed disabled:opacity-50",
                !isClockedOut
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground",
            ),
        [isClockedOut],
    );

    const formatClockInTime = useCallback(() => {
        if (!timeClock?.day || !timeClock.clockIn) {
            return null;
        }

        const isoValue = `${timeClock.day}T${timeClock.clockIn}`;
        const parsed = new Date(isoValue);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [timeClock]);

    const handleDialogChange = useCallback(
        (open: boolean) => {
            if (open && (!isAuthenticated || isProcessing || isClockedOut)) {
                return;
            }
            setIsDialogOpen(open);
        },
        [isAuthenticated, isProcessing, isClockedOut],
    );

    const handleConfirm = useCallback(async () => {
        if (!userId) {
            return;
        }

        try {
            if (isClockedIn) {
                await clockOut();
            } else if (!isClockedOut) {
                await clockIn();
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Clock action failed:", error);
        }
    }, [userId, isClockedIn, isClockedOut, clockIn, clockOut]);

    const clockDescription = useMemo(() => {
        const now = new Date();
        const currentTime = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });

        if (isClockedIn) {
            const formatted = formatClockInTime();
            return formatted
                ? `You are currently clocked in since ${formatted}. Confirm to clock out at ${currentTime}.`
                : `You are currently clocked in. Confirm to clock out at ${currentTime}.`;
        }

        return `Confirm the action to clock in at ${currentTime}.`;
    }, [isClockedIn, formatClockInTime]);

    const isButtonDisabled = !isAuthenticated || isProcessing || isClockedOut;

    const normalizePath = useCallback((input: string) => {
        if (!input) {
            return "";
        }

        if (input === "/") {
            return "/";
        }

        return input.endsWith("/") ? input.slice(0, -1) : input;
    }, []);

    const isRouteActive = useCallback(
        (target: string, exact?: boolean) => {
            if (!target || target === "#") {
                return false;
            }

            const normalized = normalizePath(target);

            if (normalized === "/") {
                return location.pathname === "/";
            }

            if (exact) {
                return location.pathname === normalized;
            }

            if (location.pathname === normalized) {
                return true;
            }

            return location.pathname.startsWith(`${normalized}/`);
        },
        [location.pathname, normalizePath],
    );

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                            <AlertDialogTrigger asChild>
                                <SidebarMenuButton
                                    tooltip={buttonLabel}
                                    disabled={isButtonDisabled}
                                    className={buttonClasses}
                                >
                                    {buttonIcon}
                                    <span>{buttonLabel}</span>
                                </SidebarMenuButton>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {isClockedIn
                                            ? "Confirm the clock out"
                                            : "Confirm the clock in"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {clockDescription}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isMutating}>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isMutating}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={handleConfirm}
                                    >
                                        Confirm
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    {items.map((item) => {
                        const isDisabled = item.disabled || !item.url || item.url === "#";
                        const isActive = !isDisabled && isRouteActive(item.url, item.exact);

                        return (
                            <SidebarMenuItem key={item.title}>
                                {isDisabled ? (
                                    <SidebarMenuButton tooltip={item.title} disabled>
                                        {item.icon ? <item.icon className="size-4" /> : null}
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        asChild
                                        isActive={isActive}
                                    >
                                        <NavLink
                                            to={item.url}
                                            end={item.exact ?? false}
                                            className="flex w-full items-center gap-2"
                                        >
                                            {item.icon ? <item.icon className="size-4" /> : null}
                                            <span>{item.title}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                )}
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
