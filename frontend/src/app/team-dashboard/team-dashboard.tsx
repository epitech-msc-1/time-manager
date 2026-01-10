import { useMutation, useQuery } from "@apollo/client/react";
import {
    IconArrowsMoveHorizontal,
    IconDotsVertical,
    IconLoader2,
    IconPencil,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";
import { type CSSProperties, useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CREATE_TEAM, DELETE_TEAM, UPDATE_TEAM } from "@/graphql/mutations";
import { GET_TEAMS, GET_USERS } from "@/graphql/queries";

interface TeamRecord {
    id: string;
    description?: string | null;
    nrMembers?: number | null;
}

interface TeamsQueryResult {
    teams: TeamRecord[];
}

interface UserRecord {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isAdmin: boolean;
    team?: {
        id: string;
    } | null;
    teamManaged?: {
        id: string;
    } | null;
}

interface UsersQueryResult {
    users: UserRecord[];
}

interface TeamMemberSummary {
    id: string;
    fullName: string;
    email: string;
    isAdmin: boolean;
}

interface TeamSummary extends TeamRecord {
    members: TeamMemberSummary[];
    manager: TeamMemberSummary | null;
}

interface CreateTeamResult {
    createTeam: {
        team: TeamRecord | null;
    } | null;
}

interface CreateTeamVariables {
    description?: string | null;
}

interface UpdateTeamResult {
    updateTeam: {
        team: TeamRecord | null;
    } | null;
}

interface UpdateTeamVariables {
    id: string;
    description?: string | null;
}

interface DeleteTeamResult {
    deleteTeam: {
        ok: boolean;
    } | null;
}

interface DeleteTeamVariables {
    id: string;
}

type TeamFilter = "all" | "has-manager" | "no-manager" | "has-members" | "no-members";
type TeamSortOption =
    | "id-asc"
    | "id-desc"
    | "name-asc"
    | "name-desc"
    | "members-asc"
    | "members-desc";

const formatUserName = (firstName?: string | null, lastName?: string | null, fallback?: string) => {
    const segments = [firstName, lastName]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0));

    if (segments.length > 0) {
        return segments.join(" ");
    }

    return fallback ?? "Unknown";
};

const extractErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "An unexpected error occurred.";
};

export default function TeamDashboard() {
    const createDescriptionId = useId();
    const editDescriptionId = useId();

    const {
        data: teamsData,
        loading: teamsLoading,
        error: teamsError,
        refetch: refetchTeams,
    } = useQuery<TeamsQueryResult>(GET_TEAMS, {
        fetchPolicy: "cache-and-network",
    });
    const {
        data: usersData,
        loading: usersLoading,
        error: usersError,
        refetch: refetchUsers,
    } = useQuery<UsersQueryResult>(GET_USERS, {
        fetchPolicy: "cache-and-network",
    });

    const [createDescription, setCreateDescription] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<TeamSummary | null>(null);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
    const [teamSortOption, setTeamSortOption] = useState<TeamSortOption>("id-asc");

    const [createTeamMutation, { loading: isCreating }] = useMutation<
        CreateTeamResult,
        CreateTeamVariables
    >(CREATE_TEAM);
    const [updateTeamMutation, { loading: isUpdating }] = useMutation<
        UpdateTeamResult,
        UpdateTeamVariables
    >(UPDATE_TEAM);
    const [deleteTeamMutation, { loading: isDeleting }] = useMutation<
        DeleteTeamResult,
        DeleteTeamVariables
    >(DELETE_TEAM);

    const membersByTeam = useMemo(() => {
        const map = new Map<string, TeamMemberSummary[]>();
        const users = usersData?.users ?? [];

        for (const user of users) {
            const teamId = user.team?.id;
            if (!teamId) {
                continue;
            }

            const entry = map.get(teamId) ?? [];
            entry.push({
                id: user.id,
                fullName: formatUserName(user.firstName, user.lastName, user.email),
                email: user.email,
                isAdmin: user.isAdmin,
            });
            map.set(teamId, entry);
        }

        for (const [, value] of map) {
            value.sort((a, b) => a.fullName.localeCompare(b.fullName));
        }

        return map;
    }, [usersData?.users]);

    const managersByTeam = useMemo(() => {
        const map = new Map<string, TeamMemberSummary>();
        const users = usersData?.users ?? [];

        for (const user of users) {
            const managedId = user.teamManaged?.id;
            if (!managedId) {
                continue;
            }

            map.set(managedId, {
                id: user.id,
                fullName: formatUserName(user.firstName, user.lastName, user.email),
                email: user.email,
                isAdmin: user.isAdmin,
            });
        }

        return map;
    }, [usersData?.users]);

    const teamSummaries = useMemo<TeamSummary[]>(() => {
        const teams = teamsData?.teams ?? [];

        const summaries = teams.map<TeamSummary>((team) => {
            const members = membersByTeam.get(team.id) ?? [];
            const manager = managersByTeam.get(team.id) ?? null;

            return {
                id: team.id,
                description: team.description,
                nrMembers: team.nrMembers ?? members.length,
                members,
                manager,
            };
        });

        summaries.sort((a, b) => {
            const aNumber = Number.parseInt(a.id, 10);
            const bNumber = Number.parseInt(b.id, 10);

            if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
                return a.id.localeCompare(b.id);
            }

            return aNumber - bNumber;
        });

        return summaries;
    }, [membersByTeam, managersByTeam, teamsData?.teams]);

    const unassignedMembers = useMemo(() => {
        const users = usersData?.users ?? [];

        return users
            .filter((user) => !user.team?.id)
            .map<TeamMemberSummary>((user) => ({
                id: user.id,
                fullName: formatUserName(user.firstName, user.lastName, user.email),
                email: user.email,
                isAdmin: user.isAdmin,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [usersData?.users]);

    const isBusy = isCreating || isUpdating || isDeleting;

    const refetchAll = useCallback(async () => {
        await Promise.all([refetchTeams(), refetchUsers()]);
    }, [refetchTeams, refetchUsers]);

    const handleCreateTeam = useCallback(async () => {
        const trimmed = createDescription.trim();

        if (!trimmed) {
            toast.error("Please provide a description for the team.");
            return;
        }

        try {
            await createTeamMutation({
                variables: {
                    description: trimmed,
                },
            });

            toast.success("Team created successfully.");
            setCreateDialogOpen(false);
            setCreateDescription("");
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to create team: ${extractErrorMessage(error)}`);
        }
    }, [createDescription, createTeamMutation, refetchAll]);

    const handleOpenEdit = useCallback((team: TeamSummary) => {
        setEditingTeam(team);
        setEditDescription(team.description ?? "");
        setEditDialogOpen(true);
    }, []);

    const handleUpdateTeam = useCallback(async () => {
        if (!editingTeam) {
            return;
        }

        const trimmed = editDescription.trim();

        if (!trimmed) {
            toast.error("Please provide a description for the team.");
            return;
        }

        try {
            await updateTeamMutation({
                variables: {
                    id: editingTeam.id,
                    description: trimmed,
                },
            });

            toast.success("Team updated successfully.");
            setEditDialogOpen(false);
            setEditingTeam(null);
            setEditDescription("");
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to update team: ${extractErrorMessage(error)}`);
        }
    }, [editDescription, editingTeam, refetchAll, updateTeamMutation]);

    const handleRequestDelete = useCallback((team: TeamSummary) => {
        setTeamToDelete(team);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteTeam = useCallback(async () => {
        if (!teamToDelete) {
            return;
        }

        try {
            await deleteTeamMutation({
                variables: {
                    id: teamToDelete.id,
                },
            });

            toast.success("Team deleted successfully.");
            setDeleteDialogOpen(false);
            setTeamToDelete(null);
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to delete team: ${extractErrorMessage(error)}`);
        }
    }, [deleteTeamMutation, refetchAll, teamToDelete]);

    const handleCreateDialogChange = useCallback((open: boolean) => {
        setCreateDialogOpen(open);
        if (!open) {
            setCreateDescription("");
        }
    }, []);

    const handleEditDialogChange = useCallback((open: boolean) => {
        setEditDialogOpen(open);
        if (!open) {
            setEditingTeam(null);
            setEditDescription("");
        }
    }, []);

    const handleDeleteDialogChange = useCallback((open: boolean) => {
        setDeleteDialogOpen(open);
        if (!open) {
            setTeamToDelete(null);
        }
    }, []);

    const loadingState = teamsLoading || usersLoading;

    const filteredTeams = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const collator = new Intl.Collator("en", { sensitivity: "base" });

        const matchesFilter = (team: TeamSummary) => {
            switch (teamFilter) {
                case "has-manager":
                    return Boolean(team.manager);
                case "no-manager":
                    return !team.manager;
                case "has-members":
                    return team.members.length > 0;
                case "no-members":
                    return team.members.length === 0;
                default:
                    return true;
            }
        };

        const matchesSearch = (team: TeamSummary) => {
            if (!term) {
                return true;
            }

            const label = `team ${team.id}`.toLowerCase();
            const description = (team.description ?? "").toLowerCase();
            const manager = team.manager?.fullName.toLowerCase() ?? "";
            const members = team.members.map((member) => member.fullName.toLowerCase());

            return [label, description, manager, ...members].some((value) => value.includes(term));
        };

        const filtered = teamSummaries.filter((team) => matchesFilter(team) && matchesSearch(team));

        if (filtered.length <= 1) {
            return filtered;
        }

        const parseId = (value: string) => {
            const parsed = Number.parseInt(value, 10);
            return Number.isNaN(parsed) ? null : parsed;
        };

        const compareById = (aValue: string, bValue: string, direction: 1 | -1) => {
            const aId = parseId(aValue);
            const bId = parseId(bValue);

            if (aId !== null && bId !== null) {
                return (aId - bId) * direction;
            }

            if (aId !== null) {
                return -1 * direction;
            }

            if (bId !== null) {
                return 1 * direction;
            }

            return direction === 1
                ? collator.compare(aValue, bValue)
                : collator.compare(bValue, aValue);
        };

        return [...filtered].sort((a, b) => {
            switch (teamSortOption) {
                case "id-desc":
                    return compareById(a.id, b.id, -1);
                case "name-asc": {
                    const aLabel = a.description ?? `Team ${a.id}`;
                    const bLabel = b.description ?? `Team ${b.id}`;
                    return collator.compare(aLabel, bLabel);
                }
                case "name-desc": {
                    const aLabel = a.description ?? `Team ${a.id}`;
                    const bLabel = b.description ?? `Team ${b.id}`;
                    return collator.compare(bLabel, aLabel);
                }
                case "members-asc": {
                    const diff = a.members.length - b.members.length;
                    if (diff !== 0) {
                        return diff;
                    }
                    return collator.compare(a.id, b.id);
                }
                case "members-desc": {
                    const diff = b.members.length - a.members.length;
                    if (diff !== 0) {
                        return diff;
                    }
                    return collator.compare(a.id, b.id);
                }
                default:
                    return compareById(a.id, b.id, 1);
            }
        });
    }, [searchTerm, teamFilter, teamSortOption, teamSummaries]);

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
                <SiteHeader title="Team Dashboard" />
                <div className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6">
                        <Card className="mx-4 sm:mx-6">
                            <CardHeader>
                                <CardTitle>Teams</CardTitle>
                                <CardDescription>
                                    Create, edit, and delete teams. Members are unassigned
                                    automatically when a team is removed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
                                        <Input
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Search by team, manager, or member"
                                            aria-label="Search teams"
                                        />
                                        <Select
                                            value={teamFilter}
                                            onValueChange={(value) =>
                                                setTeamFilter(value as TeamFilter)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter teams" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All teams</SelectItem>
                                                <SelectItem value="has-manager">
                                                    With manager
                                                </SelectItem>
                                                <SelectItem value="no-manager">
                                                    Without manager
                                                </SelectItem>
                                                <SelectItem value="has-members">
                                                    With members
                                                </SelectItem>
                                                <SelectItem value="no-members">
                                                    Without members
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={teamSortOption}
                                            onValueChange={(value) =>
                                                setTeamSortOption(value as TeamSortOption)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sort teams" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="id-asc">
                                                    ID (Ascending)
                                                </SelectItem>
                                                <SelectItem value="id-desc">
                                                    ID (Descending)
                                                </SelectItem>
                                                <SelectItem value="name-asc">
                                                    Description (A → Z)
                                                </SelectItem>
                                                <SelectItem value="name-desc">
                                                    Description (Z → A)
                                                </SelectItem>
                                                <SelectItem value="members-asc">
                                                    Members (# Asc)
                                                </SelectItem>
                                                <SelectItem value="members-desc">
                                                    Members (# Desc)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        onClick={() => setCreateDialogOpen(true)}
                                        disabled={isBusy}
                                        className="shrink-0"
                                    >
                                        <IconPlus className="size-4" />
                                        Create Team
                                    </Button>
                                </div>
                                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs lg:hidden">
                                    <IconArrowsMoveHorizontal className="size-3.5" />
                                    <span>Swipe horizontally to see all columns.</span>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[200px]">
                                                    Team
                                                </TableHead>
                                                <TableHead>Members</TableHead>
                                                <TableHead className="min-w-[160px]">
                                                    Manager
                                                </TableHead>
                                                <TableHead className="w-[120px] text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingState ? (
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                                                            <IconLoader2 className="size-4 animate-spin" />
                                                            Loading teams...
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredTeams.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        <p className="text-muted-foreground py-6 text-center text-sm">
                                                            {teamSummaries.length === 0
                                                                ? "No teams found. Create your first team to get started."
                                                                : "No teams match your filters."}
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredTeams.map((team) => (
                                                    <TableRow key={team.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium">
                                                                    Team {team.id}
                                                                </span>
                                                                <span className="text-muted-foreground text-sm">
                                                                    {team.description ??
                                                                        "No description provided"}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {team.members.length === 0 ? (
                                                                <span className="text-muted-foreground text-xs">
                                                                    No members
                                                                </span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {team.members.map((member) => (
                                                                        <Badge
                                                                            key={member.id}
                                                                            variant="outline"
                                                                        >
                                                                            {member.fullName}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {team.manager ? (
                                                                <Badge variant="secondary">
                                                                    {team.manager.fullName}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">
                                                                    No manager assigned
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-end">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            aria-label={`Open actions for team ${team.id}`}
                                                                            disabled={isBusy}
                                                                        >
                                                                            <IconDotsVertical className="size-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent
                                                                        align="end"
                                                                        className="w-40"
                                                                    >
                                                                        <DropdownMenuItem
                                                                            onSelect={(event) => {
                                                                                event.preventDefault();
                                                                                handleOpenEdit(
                                                                                    team,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Edit team
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                            onSelect={(event) => {
                                                                                event.preventDefault();
                                                                                handleRequestDelete(
                                                                                    team,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Delete team
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {teamsError ? (
                                    <p className="text-destructive mt-4 text-sm">
                                        Failed to load teams: {teamsError.message}
                                    </p>
                                ) : null}
                                {usersError ? (
                                    <p className="text-destructive mt-2 text-sm">
                                        Failed to load users: {usersError.message}
                                    </p>
                                ) : null}
                            </CardContent>
                        </Card>
                        <Card className="mx-4 sm:mx-6">
                            <CardHeader>
                                <CardTitle>Unassigned Members</CardTitle>
                                <CardDescription>Users without a team assignment.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {usersLoading && unassignedMembers.length === 0 ? (
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <IconLoader2 className="size-4 animate-spin" />
                                        Loading members...
                                    </div>
                                ) : unassignedMembers.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Everyone is assigned to a team.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {unassignedMembers.map((member) => (
                                            <Badge key={member.id} variant="outline">
                                                {member.fullName}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SidebarInset>

            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a new team</DialogTitle>
                        <DialogDescription>
                            Set a clear description to help members understand the team scope.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createDescriptionId}>Team description</Label>
                            <Input
                                id={createDescriptionId}
                                placeholder="e.g. Customer Success"
                                value={createDescription}
                                onChange={(event) => setCreateDescription(event.target.value)}
                                disabled={isCreating}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => handleCreateDialogChange(false)}
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTeam} disabled={isCreating}>
                            {isCreating ? (
                                <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                                <IconPlus className="size-4" />
                            )}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit team</DialogTitle>
                        <DialogDescription>
                            Update the description to keep your collaborators aligned.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editDescriptionId}>Team description</Label>
                            <Input
                                id={editDescriptionId}
                                placeholder="e.g. Customer Success"
                                value={editDescription}
                                onChange={(event) => setEditDescription(event.target.value)}
                                disabled={isUpdating}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => handleEditDialogChange(false)}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateTeam} disabled={isUpdating}>
                            {isUpdating ? (
                                <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                                <IconPencil className="size-4" />
                            )}
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete team</AlertDialogTitle>
                        <AlertDialogDescription>
                            {teamToDelete ? (
                                <span>
                                    Deleting <strong>Team {teamToDelete.id}</strong> will unassign
                                    its {teamToDelete.members.length} member(s). This action cannot
                                    be undone.
                                </span>
                            ) : (
                                "This action cannot be undone."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTeam}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                                <IconTrash className="size-4" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}
