import { type Icon, IconTimeDuration0 } from "@tabler/icons-react";
import { useState, useEffect } from "react";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useClockIn, useClockOut } from "@/hooks/useClockInOut";
import { SessionService } from "@/lib/session";
import { toast } from "sonner";

export function NavMain({
    items,
}: {
    items: {
        title: string;
        url: string;
        icon?: Icon;
    }[];
}) {
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const { clockIn, loading: clockInLoading } = useClockIn();
    const { clockOut, loading: clockOutLoading } = useClockOut();

    useEffect(() => {
        const hasActiveClock = SessionService.hasActiveClock();
        const hasCompleted = SessionService.hasCompletedToday();
        console.log(
            "NavMain: Initial state check, hasActiveClock:",
            hasActiveClock,
            "hasCompleted:",
            hasCompleted
        );
        setIsClockedIn(hasActiveClock);
        setIsCompleted(hasCompleted);
    }, []);

    useEffect(() => {
        if (!clockInLoading && !clockOutLoading) {
            const hasActiveClock = SessionService.hasActiveClock();
            const hasCompleted = SessionService.hasCompletedToday();
            console.log(
                "NavMain: State check after loading change, hasActiveClock:",
                hasActiveClock,
                "hasCompleted:",
                hasCompleted
            );
            setIsClockedIn(hasActiveClock);
            setIsCompleted(hasCompleted);
        }
    }, [clockInLoading, clockOutLoading]);

    const handleClockAction = async () => {
        const user = SessionService.getUser();

        if (!user) {
            toast.error("Non authentifié", {
                description: "Veuillez vous connecter d'abord",
            });
            return;
        }

        try {
            if (isClockedIn) {
                await clockOut(user.id);
                setIsClockedIn(false);
            } else {
                await clockIn(user.id);
                setIsClockedIn(true);
            }
        } catch (error) {
            const hasActiveClock = SessionService.hasActiveClock();
            setIsClockedIn(hasActiveClock);
        }
    };

    const loading = clockInLoading || clockOutLoading;

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            onClick={handleClockAction}
                            disabled={loading || isCompleted}
                            tooltip={
                                isCompleted
                                    ? "Journée terminée ✓"
                                    : isClockedIn
                                    ? "Quick Clock Out"
                                    : "Quick Clock In"
                            }
                            className={`min-w-8 duration-200 ease-linear disabled:opacity-50 disabled:cursor-not-allowed ${
                                isCompleted
                                    ? "bg-muted text-muted-foreground"
                                    : isClockedIn
                                    ? "bg-destructive text-white hover:bg-destructive/90 hover:text-white active:bg-destructive/90 active:text-white"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                            }`}
                        >
                            <IconTimeDuration0 />
                            <span>
                                {loading
                                    ? "Chargement..."
                                    : isCompleted
                                    ? "✓ Terminé"
                                    : isClockedIn
                                    ? "Quick Clock Out"
                                    : "Quick Clock In"}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton tooltip={item.title}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
