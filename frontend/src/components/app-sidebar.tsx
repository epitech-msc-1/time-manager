import {
    type Icon,
    IconBuilding,
    IconDashboard,
    IconUserCog,
    IconUsersGroup,
} from "@tabler/icons-react";
import type * as React from "react";
import { useEffect, useState } from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { useTheme } from "@/components/theme-provider";
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

    data.navMain.push({
        title: "Company Dashboard",
        url: "#",
        icon: IconBuilding,
        disabled: true,
    });

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
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
