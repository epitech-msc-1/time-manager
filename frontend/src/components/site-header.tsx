import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useMemo } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface HeaderUserOption {
    id: string;
    label: string;
    description?: string | null;
    initials: string;
}

interface SiteHeaderProps {
    title?: string;
    selectedUser?: HeaderUserOption | null;
    userOptions?: HeaderUserOption[];
    canSelectUser?: boolean;
    onUserSelect?: (userId: string) => void;
    isUserSelectorDisabled?: boolean;
}

export function SiteHeader({
    title = "My Dashboard",
    selectedUser = null,
    userOptions = [],
    canSelectUser = false,
    onUserSelect,
    isUserSelectorDisabled = false,
}: SiteHeaderProps) {
    const hasSelector = Boolean(canSelectUser && onUserSelect && selectedUser);

    const displayUser = useMemo(() => {
        if (selectedUser) {
            return selectedUser;
        }

        if (userOptions.length > 0) {
            return userOptions[0] ?? null;
        }

        return null;
    }, [selectedUser, userOptions]);

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <h1 className="text-base font-medium">{title}</h1>

                <div className="ml-auto flex items-center gap-2">
                    {hasSelector && displayUser && onUserSelect ? (
                        <TeamViewerSelector
                            selectedUser={displayUser}
                            options={userOptions}
                            onUserSelect={onUserSelect}
                            disabled={isUserSelectorDisabled}
                        />
                    ) : null}
                </div>
                <ModeToggle />
            </div>
        </header>
    );
}

interface TeamViewerSelectorProps {
    selectedUser: HeaderUserOption;
    options: HeaderUserOption[];
    onUserSelect: (userId: string) => void;
    disabled?: boolean;
}

function TeamViewerSelector({
    selectedUser,
    options,
    onUserSelect,
    disabled,
}: TeamViewerSelectorProps) {
    const handleValueChange = (value: string) => {
        if (disabled) {
            return;
        }

        if (value === selectedUser.id) {
            return;
        }

        onUserSelect(value);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={cn(
                        "bg-sidebar-accent/30 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex h-10 min-w-[12rem] max-w-[16rem] items-center gap-3 rounded-lg px-2 font-medium",
                        disabled && "cursor-not-allowed opacity-60",
                    )}
                    aria-label="Select a teammate to view stats"
                >
                    <div className="bg-ring text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold uppercase">
                        {selectedUser.initials}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
                        <span className="truncate text-sm font-medium">{selectedUser.label}</span>
                        <span className="text-muted-foreground truncate text-xs">
                            {selectedUser.description ?? "Team member"}
                        </span>
                    </div>
                    <IconChevronDown className="ml-2 size-4 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Select a teammate</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="flex flex-col gap-1">
                    {options.map((option) => {
                        const isActive = option.id === selectedUser.id;

                        return (
                            <DropdownMenuItem
                                key={option.id}
                                onSelect={() => handleValueChange(option.id)}
                                className={cn(
                                    "cursor-pointer",
                                    isActive &&
                                        "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90",
                                )}
                            >
                                <div className="flex w-full items-center gap-3">
                                    <div className="bg-sidebar-primary/80 text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold uppercase">
                                        {option.initials}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col leading-none">
                                        <span className="truncate text-sm font-medium">
                                            {option.label}
                                        </span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            {option.description ?? "Team member"}
                                        </span>
                                    </div>
                                    {isActive ? <IconCheck className="size-4 shrink-0" /> : null}
                                </div>
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
