import { useMutation, useQuery } from "@apollo/client/react";
import {
    IconArrowsMoveHorizontal,
    IconBadgeAd,
    IconDotsVertical,
    IconLoader2,
    IconPencil,
    IconPlus,
    IconShieldHalf,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { CREATE_USER, DELETE_USER, UPDATE_USER } from "@/graphql/mutations";
import { GET_TEAMS, GET_USERS } from "@/graphql/queries";
import { cn } from "@/lib/utils";

interface TeamRecord {
    id: string;
    description?: string | null;
}

interface TeamsQueryResult {
    teams: TeamRecord[];
}

interface UserRecord {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    hourContract?: number | null;
    isAdmin: boolean;
    team?: {
        id: string;
        description?: string | null;
    } | null;
    teamManaged?: {
        id: string;
        description?: string | null;
    } | null;
}

interface UsersQueryResult {
    users: UserRecord[];
}

interface CreateUserResult {
    createUser: {
        user: UserRecord | null;
    } | null;
}

interface UpdateUserResult {
    updateUser: {
        user: UserRecord | null;
    } | null;
}

interface DeleteUserResult {
    deleteUser: {
        ok: boolean;
    } | null;
}

interface CreateUserVariables {
    email: string;
    password: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    hourContract?: number | null;
    teamId?: string | null;
    teamManagedId?: string | null;
    isAdmin?: boolean;
}

interface UpdateUserVariables {
    id: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    hourContract?: number | null;
    teamId?: string | null;
    teamManagedId?: string | null;
    isAdmin?: boolean;
}

interface DeleteUserVariables {
    id: string;
}

type UserFormState = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    hourContract: string;
    teamId: string;
    teamManagedId: string;
    isAdmin: boolean;
};

const EMPTY_OPTION_VALUE = "none";
type RoleFilter = "all" | "admin" | "manager" | "member";
type RoleKey = Exclude<RoleFilter, "all">;
type SortOption = "name-asc" | "name-desc" | "email-asc" | "email-desc";

const INITIAL_FORM_STATE: UserFormState = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    hourContract: "",
    teamId: EMPTY_OPTION_VALUE,
    teamManagedId: EMPTY_OPTION_VALUE,
    isAdmin: false,
};

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

const parseHourContract = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error("Hour contract must be a positive number.");
    }

    return parsed;
};

const getTeamLabel = (team?: { id: string; description?: string | null } | null) => {
    if (!team?.id) {
        return "Unassigned";
    }

    const description = team.description?.trim();

    if (!description) {
        return `Team ${team.id}`;
    }

    return `${description} (Team ${team.id})`;
};

const buildRoleLabel = (user: UserRecord) => {
    if (user.isAdmin) {
        return "Administrator";
    }

    if (user.teamManaged?.id) {
        return "Manager";
    }

    return "Member";
};

const resolveRoleKey = (user: UserRecord): RoleKey => {
    if (user.isAdmin) {
        return "admin";
    }

    if (user.teamManaged?.id) {
        return "manager";
    }

    return "member";
};

type UserRow = UserRecord & {
    fullName: string;
    role: string;
    roleKey: RoleKey;
};

export default function UsersDashboard() {
    const [createForm, setCreateForm] = useState<UserFormState>({ ...INITIAL_FORM_STATE });
    const [editForm, setEditForm] = useState<UserFormState>({ ...INITIAL_FORM_STATE });
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [sortOption, setSortOption] = useState<SortOption>("name-asc");

    const createFirstNameId = useId();
    const createLastNameId = useId();
    const createEmailId = useId();
    const createPhoneId = useId();
    const createPasswordId = useId();
    const createHourContractId = useId();
    const createAdminId = useId();
    const editFirstNameId = useId();
    const editLastNameId = useId();
    const editEmailId = useId();
    const editPhoneId = useId();
    const editPasswordId = useId();
    const editHourContractId = useId();
    const editAdminId = useId();

    const {
        data: usersData,
        loading: usersLoading,
        error: usersError,
        refetch: refetchUsers,
    } = useQuery<UsersQueryResult>(GET_USERS, {
        fetchPolicy: "cache-and-network",
    });

    const {
        data: teamsData,
        loading: teamsLoading,
        error: teamsError,
        refetch: refetchTeams,
    } = useQuery<TeamsQueryResult>(GET_TEAMS, {
        fetchPolicy: "cache-and-network",
    });

    const [createUserMutation, { loading: isCreating }] = useMutation<
        CreateUserResult,
        CreateUserVariables
    >(CREATE_USER);
    const [updateUserMutation, { loading: isUpdating }] = useMutation<
        UpdateUserResult,
        UpdateUserVariables
    >(UPDATE_USER);
    const [deleteUserMutation, { loading: isDeleting }] = useMutation<
        DeleteUserResult,
        DeleteUserVariables
    >(DELETE_USER);

    const teams = teamsData?.teams ?? [];
    const users = usersData?.users ?? [];

    const userRows = useMemo<UserRow[]>(() => {
        return users.map((user) => {
            const roleKey = resolveRoleKey(user);

            return {
                ...user,
                fullName: formatUserName(user.firstName, user.lastName, user.email),
                role: buildRoleLabel(user),
                roleKey,
            };
        });
    }, [users]);

    const isMutationRunning = isCreating || isUpdating || isDeleting;

    const teamsOptions = useMemo(() => {
        const options = teams.map((team) => ({
            value: team.id,
            label: getTeamLabel(team),
        }));

        return [
            {
                value: EMPTY_OPTION_VALUE,
                label: "Unassigned",
            },
            ...options,
        ];
    }, [teams]);

    const refetchAll = useCallback(async () => {
        await Promise.all([refetchUsers(), refetchTeams()]);
    }, [refetchTeams, refetchUsers]);

    const resetCreateForm = useCallback(() => {
        setCreateForm({ ...INITIAL_FORM_STATE });
    }, []);

    const resetEditForm = useCallback(() => {
        setEditForm({ ...INITIAL_FORM_STATE });
        setEditingUser(null);
    }, []);

    const handleCreateDialogChange = useCallback(
        (open: boolean) => {
            setCreateDialogOpen(open);
            if (!open) {
                resetCreateForm();
            }
        },
        [resetCreateForm],
    );

    const handleEditDialogChange = useCallback(
        (open: boolean) => {
            setEditDialogOpen(open);
            if (!open) {
                resetEditForm();
            }
        },
        [resetEditForm],
    );

    const handleDeleteDialogChange = useCallback((open: boolean) => {
        setDeleteDialogOpen(open);
        if (!open) {
            setUserToDelete(null);
        }
    }, []);

    const validateRequiredFields = useCallback(
        (form: UserFormState, { requirePassword }: { requirePassword: boolean }) => {
            if (!form.firstName.trim()) {
                toast.error("First name is required.");
                return false;
            }

            if (!form.lastName.trim()) {
                toast.error("Last name is required.");
                return false;
            }

            if (!form.email.trim()) {
                toast.error("Email is required.");
                return false;
            }

            if (!form.phoneNumber.trim()) {
                toast.error("Phone number is required.");
                return false;
            }

            if (requirePassword && !form.password.trim()) {
                toast.error("Password is required.");
                return false;
            }

            return true;
        },
        [],
    );

    const buildMutationPayload = useCallback((form: UserFormState) => {
        let hourContractValue: number | null = null;

        try {
            hourContractValue = parseHourContract(form.hourContract);
        } catch (error) {
            toast.error(extractErrorMessage(error));
            return null;
        }

        return {
            email: form.email.trim(),
            phoneNumber: form.phoneNumber.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            hourContract: hourContractValue,
            teamId: form.teamId === EMPTY_OPTION_VALUE ? null : form.teamId || null,
            teamManagedId:
                form.teamManagedId === EMPTY_OPTION_VALUE ? null : form.teamManagedId || null,
            isAdmin: form.isAdmin,
        };
    }, []);

    const handleCreateUser = useCallback(async () => {
        if (!validateRequiredFields(createForm, { requirePassword: true })) {
            return;
        }

        const payload = buildMutationPayload(createForm);

        if (!payload) {
            return;
        }

        try {
            await createUserMutation({
                variables: {
                    ...payload,
                    password: createForm.password,
                },
            });

            toast.success("User created successfully.");
            handleCreateDialogChange(false);
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to create user: ${extractErrorMessage(error)}`);
        }
    }, [
        buildMutationPayload,
        createForm,
        createUserMutation,
        handleCreateDialogChange,
        refetchAll,
        validateRequiredFields,
    ]);

    const handleEditUser = useCallback((user: UserRecord) => {
        setEditingUser(user);
        setEditForm({
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.email,
            phoneNumber: user.phoneNumber ?? "",
            password: "",
            hourContract: user.hourContract?.toString() ?? "",
            teamId: user.team?.id ?? EMPTY_OPTION_VALUE,
            teamManagedId: user.teamManaged?.id ?? EMPTY_OPTION_VALUE,
            isAdmin: Boolean(user.isAdmin),
        });
        setEditDialogOpen(true);
    }, []);

    const handleUpdateUser = useCallback(async () => {
        if (!editingUser) {
            return;
        }

        if (!validateRequiredFields(editForm, { requirePassword: false })) {
            return;
        }

        const payload = buildMutationPayload(editForm);

        if (!payload) {
            return;
        }

        const variables: UpdateUserVariables = {
            id: editingUser.id,
            ...payload,
        };

        if (editForm.password.trim()) {
            variables.password = editForm.password;
        }

        try {
            await updateUserMutation({
                variables,
            });

            toast.success("User updated successfully.");
            handleEditDialogChange(false);
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to update user: ${extractErrorMessage(error)}`);
        }
    }, [
        buildMutationPayload,
        editForm,
        editingUser,
        handleEditDialogChange,
        refetchAll,
        updateUserMutation,
        validateRequiredFields,
    ]);

    const handleRequestDelete = useCallback((user: UserRecord) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteUser = useCallback(async () => {
        if (!userToDelete) {
            return;
        }

        try {
            await deleteUserMutation({
                variables: {
                    id: userToDelete.id,
                },
            });

            toast.success("User deleted successfully.");
            handleDeleteDialogChange(false);
            await refetchAll();
        } catch (error) {
            toast.error(`Failed to delete user: ${extractErrorMessage(error)}`);
        }
    }, [deleteUserMutation, handleDeleteDialogChange, refetchAll, userToDelete]);

    const filteredRows = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        const filtered = userRows.filter((row) => {
            if (roleFilter !== "all" && row.roleKey !== roleFilter) {
                return false;
            }

            if (!term) {
                return true;
            }

            const nameMatches = row.fullName.toLowerCase().includes(term);
            const emailMatches = row.email.toLowerCase().includes(term);

            return nameMatches || emailMatches;
        });

        if (filtered.length <= 1) {
            return filtered;
        }

        const collator = new Intl.Collator("en", { sensitivity: "base" });

        return [...filtered].sort((a, b) => {
            switch (sortOption) {
                case "name-desc":
                    return collator.compare(b.fullName, a.fullName);
                case "email-asc":
                    return collator.compare(a.email, b.email);
                case "email-desc":
                    return collator.compare(b.email, a.email);
                default:
                    return collator.compare(a.fullName, b.fullName);
            }
        });
    }, [roleFilter, searchTerm, sortOption, userRows]);

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
            <SidebarInset className="overflow-x-hidden">
                <SiteHeader title="Users Dashboard" />
                <div className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6">
                        <Card className="mx-4 sm:mx-6">
                            <CardHeader className="gap-3">
                                <CardTitle>Users</CardTitle>
                                <CardDescription>
                                    Manage platform accounts. Only administrators have access to
                                    this view.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
                                        <Input
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Search by name or email"
                                            aria-label="Search users"
                                        />
                                        <Select
                                            value={roleFilter}
                                            onValueChange={(value) =>
                                                setRoleFilter(value as RoleFilter)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter by role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All roles</SelectItem>
                                                <SelectItem value="admin">
                                                    Administrators
                                                </SelectItem>
                                                <SelectItem value="manager">Managers</SelectItem>
                                                <SelectItem value="member">Members</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={sortOption}
                                            onValueChange={(value) =>
                                                setSortOption(value as SortOption)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sort users" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name-asc">
                                                    Name (A → Z)
                                                </SelectItem>
                                                <SelectItem value="name-desc">
                                                    Name (Z → A)
                                                </SelectItem>
                                                <SelectItem value="email-asc">
                                                    Email (A → Z)
                                                </SelectItem>
                                                <SelectItem value="email-desc">
                                                    Email (Z → A)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        onClick={() => setCreateDialogOpen(true)}
                                        disabled={isMutationRunning}
                                        className="shrink-0"
                                    >
                                        <IconPlus className="size-4" />
                                        Create User
                                    </Button>
                                </div>
                                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs lg:hidden">
                                    <IconArrowsMoveHorizontal className="size-3.5" />
                                    <span>Swipe horizontally to see all columns.</span>
                                </div>
                                <div className="w-full overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[140px]">
                                                    User
                                                </TableHead>
                                                <TableHead className="min-w-[180px]">
                                                    Email
                                                </TableHead>
                                                <TableHead className="min-w-[140px]">
                                                    Phone
                                                </TableHead>
                                                <TableHead>Team</TableHead>
                                                <TableHead className="min-w-[140px]">
                                                    Role
                                                </TableHead>
                                                <TableHead className="w-[120px] text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {usersLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6}>
                                                        <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                                                            <IconLoader2 className="size-4 animate-spin" />
                                                            Loading users...
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredRows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6}>
                                                        <p className="text-muted-foreground py-6 text-center text-sm">
                                                            {userRows.length === 0
                                                                ? "No users found."
                                                                : "No users match your filters."}
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredRows.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium">
                                                                    {user.fullName}
                                                                </span>
                                                                <span className="text-muted-foreground text-xs">
                                                                    #{user.id}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[240px] truncate">
                                                            {user.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.phoneNumber ?? "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span>
                                                                    {getTeamLabel(user.team)}
                                                                </span>
                                                                {user.teamManaged?.id ? (
                                                                    <span className="text-muted-foreground text-xs">
                                                                        Manages{" "}
                                                                        {getTeamLabel(
                                                                            user.teamManaged,
                                                                        )}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={
                                                                        user.isAdmin
                                                                            ? "default"
                                                                            : "secondary"
                                                                    }
                                                                    className={cn(
                                                                        user.isAdmin &&
                                                                            "bg-primary text-primary-foreground",
                                                                    )}
                                                                >
                                                                    {user.role}
                                                                </Badge>
                                                                {user.isAdmin ? (
                                                                    <IconBadgeAd className="size-4 text-muted-foreground" />
                                                                ) : user.teamManaged?.id ? (
                                                                    <IconShieldHalf className="size-4 text-muted-foreground" />
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-end">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            aria-label={`Open actions for ${user.fullName}`}
                                                                            disabled={
                                                                                isMutationRunning
                                                                            }
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
                                                                                handleEditUser(
                                                                                    user,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Edit user
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                            onSelect={(event) => {
                                                                                event.preventDefault();
                                                                                handleRequestDelete(
                                                                                    user,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Delete user
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
                                {usersError ? (
                                    <p className="text-destructive mt-4 text-sm">
                                        Failed to load users: {usersError.message}
                                    </p>
                                ) : null}
                                {teamsError ? (
                                    <p className="text-destructive mt-2 text-sm">
                                        Failed to load teams: {teamsError.message}
                                    </p>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SidebarInset>

            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>Create a new user</DialogTitle>
                        <DialogDescription>
                            Provide the account details. You can assign a team and manager scope now
                            or later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createFirstNameId}>First name</Label>
                            <Input
                                id={createFirstNameId}
                                value={createForm.firstName}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        firstName: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createLastNameId}>Last name</Label>
                            <Input
                                id={createLastNameId}
                                value={createForm.lastName}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        lastName: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createEmailId}>Email</Label>
                            <Input
                                id={createEmailId}
                                type="email"
                                value={createForm.email}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createPhoneId}>Phone number</Label>
                            <Input
                                id={createPhoneId}
                                value={createForm.phoneNumber}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        phoneNumber: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createPasswordId}>Password</Label>
                            <Input
                                id={createPasswordId}
                                type="password"
                                value={createForm.password}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        password: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={createHourContractId}>Hour contract (weekly)</Label>
                            <Input
                                id={createHourContractId}
                                value={createForm.hourContract}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        hourContract: event.target.value,
                                    }))
                                }
                                disabled={isCreating}
                                placeholder="e.g. 35"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Team</Label>
                            <Select
                                value={createForm.teamId}
                                onValueChange={(value) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        teamId: value,
                                    }))
                                }
                                disabled={isCreating || teamsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamsOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Managed team</Label>
                            <Select
                                value={createForm.teamManagedId}
                                onValueChange={(value) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        teamManagedId: value,
                                    }))
                                }
                                disabled={isCreating || teamsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamsOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={createAdminId}
                                checked={createForm.isAdmin}
                                onCheckedChange={(checked) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        isAdmin: Boolean(checked),
                                    }))
                                }
                                disabled={isCreating}
                            />
                            <Label htmlFor={createAdminId} className="cursor-pointer">
                                Administrator
                            </Label>
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
                        <Button onClick={handleCreateUser} disabled={isCreating}>
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
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>Edit user</DialogTitle>
                        <DialogDescription>
                            Update the account information. Leave the password field empty to keep
                            the current one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editFirstNameId}>First name</Label>
                            <Input
                                id={editFirstNameId}
                                value={editForm.firstName}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        firstName: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editLastNameId}>Last name</Label>
                            <Input
                                id={editLastNameId}
                                value={editForm.lastName}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        lastName: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editEmailId}>Email</Label>
                            <Input
                                id={editEmailId}
                                type="email"
                                value={editForm.email}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editPhoneId}>Phone number</Label>
                            <Input
                                id={editPhoneId}
                                value={editForm.phoneNumber}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        phoneNumber: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editPasswordId}>Password</Label>
                            <Input
                                id={editPasswordId}
                                type="password"
                                value={editForm.password}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        password: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={editHourContractId}>Hour contract (weekly)</Label>
                            <Input
                                id={editHourContractId}
                                value={editForm.hourContract}
                                onChange={(event) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        hourContract: event.target.value,
                                    }))
                                }
                                disabled={isUpdating}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Team</Label>
                            <Select
                                value={editForm.teamId}
                                onValueChange={(value) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        teamId: value,
                                    }))
                                }
                                disabled={isUpdating || teamsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamsOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Managed team</Label>
                            <Select
                                value={editForm.teamManagedId}
                                onValueChange={(value) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        teamManagedId: value,
                                    }))
                                }
                                disabled={isUpdating || teamsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamsOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={editAdminId}
                                checked={editForm.isAdmin}
                                onCheckedChange={(checked) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        isAdmin: Boolean(checked),
                                    }))
                                }
                                disabled={isUpdating}
                            />
                            <Label htmlFor={editAdminId} className="cursor-pointer">
                                Administrator
                            </Label>
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
                        <Button onClick={handleUpdateUser} disabled={isUpdating}>
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
                        <AlertDialogTitle>Delete user</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToDelete ? (
                                <span>
                                    Deleting{" "}
                                    <strong>
                                        {formatUserName(
                                            userToDelete.firstName,
                                            userToDelete.lastName,
                                            userToDelete.email,
                                        )}
                                    </strong>{" "}
                                    will immediately remove their access. This action cannot be
                                    undone.
                                </span>
                            ) : (
                                "This action cannot be undone."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
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
