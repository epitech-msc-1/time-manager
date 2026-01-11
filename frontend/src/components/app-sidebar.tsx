import {
    type Icon,
    IconCheckupList,
    IconDashboard,
    IconFileChart,
    IconMessagePlus,
    IconUserCog,
    IconUsersGroup,
} from "@tabler/icons-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { ExportDialog } from "@/components/export-dialog";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { useTheme } from "@/components/theme-provider";
import PopUpRaiseRequest from "@/components/ui/PopUpRaiseRequest";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const auth = useAuth();
    const user = auth.user;
    const { theme } = useTheme();
    const [isLightTheme, setIsLightTheme] = useState(false);
    const [showRaisePopup, setShowRaisePopup] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Block body scroll when popup is open
    useEffect(() => {
        if (showRaisePopup) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showRaisePopup]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = window.document.documentElement;
        const resolvedTheme =
            theme === "system" ? (root.classList.contains("dark") ? "dark" : "light") : theme;

        setIsLightTheme(resolvedTheme === "light");
    }, [theme]);

    type SidebarNavItem = {
        title: string;
        url: string;
        icon: Icon;
        disabled?: boolean;
    };

    const data = {
        user: {
            name: "Loading",
            email: "Loding",
            initials: "L",
        },
        navMain: [
            {
                title: "My Dashboard",
                url: "/dashboard",
                icon: IconDashboard,
            },
        ] as SidebarNavItem[],
    };

    if (user?.isAdmin || user?.isManager) {
        data.navMain.push({
            title: "Manager Dashboard",
            url: "/manager-dashboard",
            icon: IconCheckupList,
        });
    }

    if (user?.isAdmin) {
        data.navMain.push({
            title: "Team Dashboard",
            url: "/team-dashboard",
            icon: IconUsersGroup,
        });
        data.navMain.push({
            title: "Users Dashboard",
            url: "/users-dashboard",
            icon: IconUserCog,
        });
    }

    if (user) {
        data.user = {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            initials: `${user.firstName[0]}${user.lastName[0]}`,
        };
    }

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="/">
                                {isLightTheme ? (
                                    <span
                                        role="img"
                                        aria-label="PrimeBank Logo"
                                        className="!size-6 rounded-sm bg-ring transition-colors"
                                        style={{
                                            maskImage: "url('/primebank-logo.png')",
                                            maskSize: "contain",
                                            maskRepeat: "no-repeat",
                                            maskPosition: "center",
                                            WebkitMaskImage: "url('/primebank-logo.png')",
                                            WebkitMaskSize: "contain",
                                            WebkitMaskRepeat: "no-repeat",
                                            WebkitMaskPosition: "center",
                                        }}
                                    />
                                ) : (
                                    <img
                                        src="primebank-logo.png"
                                        alt="PrimeBank Logo"
                                        className="!size-6"
                                    />
                                )}
                                <span className="text-base font-semibold">PrimeBank</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <div className="space-y-2">
                    <div className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Quick Actions
                    </div>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setShowRaisePopup(true)}
                                tooltip="Request a change to your time logs"
                            >
                                <IconMessagePlus />
                                <span>Request Time Modification</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setShowExportDialog(true)}
                                tooltip="Export your time report"
                            >
                                <IconFileChart />
                                <span>Export Report</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>

                <div className="border-t" />

                <NavUser user={data.user} />

                <ExportDialog
                    isOpen={showExportDialog}
                    onClose={() => setShowExportDialog(false)}
                    defaultStartDate={startOfMonth}
                    defaultEndDate={endOfMonth}
                    userId={user?.id}
                />

                {showRaisePopup && <PopUpRaiseRequest onClose={() => setShowRaisePopup(false)} />}
            </SidebarFooter>
        </Sidebar>
    );
}
