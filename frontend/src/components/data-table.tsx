import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    type UniqueIdentifier,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    IconAlertTriangle,
    IconCancel,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconGripVertical,
    IconLayoutColumns,
    IconRefresh,
    IconSearch,
    IconUserMinus,
    IconUserPlus,
} from "@tabler/icons-react";
import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Row,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ADD_USER_TO_TEAM, UPDATE_USER } from "@/graphql/mutations";
import { GET_USER_BY_EMAIL } from "@/graphql/queries";
import { cn } from "@/lib/utils";

export const schema = z.object({
    id: z.number(),
    firstname: z.string(),
    lastname: z.string(),
    status: z.string(),
    presence: z.boolean(),
    score: z.number(),
});

function DragHandle({ id }: { id: number }) {
    const { attributes, listeners } = useSortable({
        id,
    });

    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 hover:bg-transparent"
        >
            <IconGripVertical className="text-muted-foreground size-3" />
            <span className="sr-only">Drag to reorder</span>
        </Button>
    );
}

function createBaseColumns(
    handleRemoveUser: (userId: string, firstName: string, lastName: string) => Promise<void>,
    currentUserId: string | null,
    canManageMembers: boolean,
): ColumnDef<z.infer<typeof schema>>[] {
    return [
        {
            id: "drag",
            header: () => null,
            cell: ({ row }) => <DragHandle id={row.original.id} />,
        },
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: true,
            enableHiding: false,
        },
        {
            accessorKey: "firstname",
            header: "Firstname",
            cell: ({ row }) => {
                return <span>{row.original.firstname}</span>;
            },
            enableHiding: false,
        },
        {
            accessorKey: "lastname",
            header: "Lastname",
            cell: ({ row }) => {
                return <span>{row.original.lastname}</span>;
            },
            enableHiding: false,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <>
                    {row.original.status === "Manager" ? (
                        <Badge variant="secondary" className="bg-accent px-1.5">
                            {row.original.status}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground px-1.5">
                            {row.original.status}
                        </Badge>
                    )}
                </>
            ),
        },
        {
            accessorKey: "presence",
            header: "Presence",
            cell: ({ row }) => (
                <Badge variant="outline" className="text-muted-foreground px-1.5 shrink-0">
                    {row.original.presence === true ? (
                        <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 size-4" />
                    ) : (
                        <IconCancel className="size-4" />
                    )}
                </Badge>
            ),
        },
        {
            accessorKey: "score",
            header: () => <div className="w-full">Score</div>,
            cell: ({ row }) => (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    <Label htmlFor={`${row.original.id}-target`} className="sr-only">
                        Score
                    </Label>
                    <span defaultValue={row.original.score} id={`${row.original.id}-score`}>
                        {row.original.score}
                    </span>
                </form>
            ),
        },
        ...(canManageMembers
            ? [
                {
                    id: "actions",
                    cell: ({ row }) => {
                        const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
                            React.useState(false);
                        const isSelfDelete = String(row.original.id) === currentUserId;
                        const canDelete = !isSelfDelete;

                        return (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                                        size="icon"
                                    >
                                        <IconDotsVertical />
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                    <AlertDialog
                                        open={isDeleteConfirmOpen}
                                        onOpenChange={setIsDeleteConfirmOpen}
                                    >
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                disabled={!canDelete}
                                                onSelect={(e) => {
                                                    e.preventDefault();
                                                    if (canDelete) {
                                                        setIsDeleteConfirmOpen(true);
                                                    }
                                                }}
                                            >
                                                Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="flex items-center gap-2 text-xl">
                                                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                                                        <IconUserMinus className="size-5" />
                                                    </div>
                                                    Remove team member
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to remove{" "}
                                                    <strong>
                                                        {row.original.firstname}{" "}
                                                        {row.original.lastname}
                                                    </strong>{" "}
                                                    from this team? This action can be reverted by
                                                    adding them back later.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        handleRemoveUser(
                                                            String(row.original.id),
                                                            row.original.firstname,
                                                            row.original.lastname,
                                                        );
                                                        setIsDeleteConfirmOpen(false);
                                                    }}
                                                >
                                                    Remove
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        );
                    },
                } as ColumnDef<z.infer<typeof schema>>,
            ]
            : []),
    ];
}

interface UserLookupResult {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
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

interface UserByEmailQueryResult {
    userByEmail: UserLookupResult | null;
}

interface AddUserToTeamResult {
    addUserToTeam: {
        team: {
            id: string;
            description?: string | null;
        };
    };
}

interface AddUserToTeamVariables {
    userId: string;
    teamId: string;
}

const EMAIL_DEBOUNCE_MS = 400;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
    return EMAIL_PATTERN.test(value.trim());
}

function translateAddMemberErrorMessage(message: string): string {
    if (message.includes("Managers cannot target admin users")) {
        return "You are not allowed to target admin accounts.";
    }
    if (message.includes("User already belongs to this team")) {
        return "This member already belongs to this team.";
    }
    if (message.includes("User already belongs to another team")) {
        return "This member already belongs to another team.";
    }
    return message;
}

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
        id: row.original.id,
    });

    return (
        <TableRow
            data-state={row.getIsSelected() && "selected"}
            data-dragging={isDragging}
            ref={setNodeRef}
            className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition,
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    );
}

interface DataTableProps {
    data: z.infer<typeof schema>[];
    isLoading?: boolean;
    canManageMembers?: boolean;
    teamId?: string | null;
    onTeamUpdated?: () => void | Promise<void>;
    currentUserIsAdmin?: boolean;
    currentUserId?: string | null;
    className?: string;
    title?: string;
}


export function DataTable({
    data: initialData,
    isLoading = false,
    canManageMembers = false,
    teamId,
    onTeamUpdated,
    currentUserIsAdmin = false,
    currentUserId = null,
    className,
    title,
}: DataTableProps) {
    const [data, setData] = React.useState(() => initialData);

    React.useEffect(() => {
        setData(initialData);
    }, [initialData]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = React.useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
    const [emailCandidate, setEmailCandidate] = React.useState("");
    const [lastRequestedEmail, setLastRequestedEmail] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState<UserLookupResult | null>(null);
    const [searchErrorMessage, setSearchErrorMessage] = React.useState<string | null>(null);
    const [isSearchingUser, setIsSearchingUser] = React.useState(false);
    const [fetchUserByEmail] = useLazyQuery<UserByEmailQueryResult>(GET_USER_BY_EMAIL, {
        fetchPolicy: "network-only",
    });
    const [addUserToTeam, { loading: isAddingMember }] = useMutation<
        AddUserToTeamResult,
        AddUserToTeamVariables
    >(ADD_USER_TO_TEAM);

    const [updateUser] = useMutation(UPDATE_USER);

    const handleRemoveUser = React.useCallback(
        async (userId: string, userFirstName: string, userLastName: string) => {
            if (!teamId) {
                toast.error("Team information is missing.");
                return;
            }

            if (userId === currentUserId) {
                toast.error("You cannot remove yourself from the team.");
                return;
            }

            if (!canManageMembers) {
                toast.error("You don't have permission to remove members.");
                return;
            }

            try {
                await updateUser({
                    variables: {
                        id: userId,
                        teamId: null,
                    },
                });
                toast.success(`${userFirstName} ${userLastName} has been removed from the team.`);
                if (onTeamUpdated) {
                    await onTeamUpdated();
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to remove this member from the team.";
                toast.error(message);
            }
        },
        [teamId, currentUserId, canManageMembers, updateUser, onTeamUpdated],
    );

    const tableColumns = React.useMemo(() => {
        const baseColumns = createBaseColumns(handleRemoveUser, currentUserId, canManageMembers);

        if (canManageMembers) {
            return baseColumns;
        }

        return baseColumns.filter((column) => {
            if ("accessorKey" in column && column.accessorKey === "score") {
                return false;
            }
            if (typeof column.id === "string" && column.id === "score") {
                return false;
            }
            return true;
        });
    }, [canManageMembers, handleRemoveUser, currentUserId]);
    const resetModalState = React.useCallback(() => {
        setEmailCandidate("");
        setLastRequestedEmail("");
        setSelectedUser(null);
        setSearchErrorMessage(null);
        setIsSearchingUser(false);
        setIsConfirmOpen(false);
    }, []);

    const handleDialogOpenChange = React.useCallback(
        (open: boolean) => {
            setIsDialogOpen(open);
            if (!open) {
                resetModalState();
            }
        },
        [resetModalState],
    );

    const handleEmailChange = React.useCallback((value: string) => {
        setEmailCandidate(value);
        setSelectedUser(null);
        setSearchErrorMessage(null);
        setIsConfirmOpen(false);
    }, []);

    React.useEffect(() => {
        if (!isDialogOpen) {
            return;
        }

        const trimmedEmail = emailCandidate.trim();

        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            if (!trimmedEmail) {
                setSearchErrorMessage(null);
            }
            setSelectedUser(null);
            return;
        }

        if (trimmedEmail === lastRequestedEmail) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setIsSearchingUser(true);
            fetchUserByEmail({ variables: { email: trimmedEmail } })
                .then((response) => {
                    const result = response.data?.userByEmail ?? null;
                    setSelectedUser(result);
                    setSearchErrorMessage(result ? null : "No user found.");
                    setLastRequestedEmail(trimmedEmail);
                })
                .catch((error) => {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to retrieve user information.";
                    const normalizedMessage = translateAddMemberErrorMessage(message);
                    setSearchErrorMessage(normalizedMessage);
                    setSelectedUser(null);
                    setLastRequestedEmail(trimmedEmail);
                })
                .finally(() => {
                    setIsSearchingUser(false);
                });
        }, EMAIL_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [emailCandidate, fetchUserByEmail, isDialogOpen, lastRequestedEmail]);

    const handleConfirmAddition = React.useCallback(async () => {
        if (!selectedUser || !teamId) {
            return;
        }

        try {
            await addUserToTeam({
                variables: {
                    userId: selectedUser.id,
                    teamId,
                },
            });
            setIsConfirmOpen(false);
            toast.success(`${selectedUser.firstName} ${selectedUser.lastName} joined the team.`);
            if (onTeamUpdated) {
                await onTeamUpdated();
            }
            resetModalState();
            setIsDialogOpen(false);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to add this member to the team.";
            const normalizedMessage = translateAddMemberErrorMessage(message);
            toast.error(normalizedMessage);
        }
    }, [addUserToTeam, onTeamUpdated, resetModalState, selectedUser, teamId]);

    const cannotAssignSelectedUser = Boolean(selectedUser?.isAdmin && !currentUserIsAdmin);
    const selectedUserTeamId = selectedUser?.team?.id ?? null;
    const isSameTeamAssignment = Boolean(
        selectedUserTeamId && teamId && String(selectedUserTeamId) === String(teamId),
    );
    const isUserAlreadyAssigned = Boolean(selectedUserTeamId);
    const isAddActionDisabled =
        !selectedUser ||
        isSearchingUser ||
        isAddingMember ||
        !teamId ||
        cannotAssignSelectedUser ||
        isUserAlreadyAssigned;
    const selectedUserRoleLabel = selectedUser
        ? selectedUser.isAdmin
            ? "Admin"
            : selectedUser.teamManaged
                ? "Manager"
                : "Member"
        : null;
    const assignmentWarningMessage = !isUserAlreadyAssigned
        ? null
        : isSameTeamAssignment
            ? "This member already belongs to this team."
            : "This member already belongs to another team.";
    const showTeamWarning = !teamId;
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const sortableId = React.useId();
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {}),
    );

    const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map(({ id }) => id), [data]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        getRowId: (row) => row.id.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    });

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setData((data) => {
                const oldIndex = dataIds.indexOf(active.id);
                const newIndex = dataIds.indexOf(over.id);
                return arrayMove(data, oldIndex, newIndex);
            });
        }
    }

    const rowId = React.useId();
    const emailFieldId = React.useId();

    return (
        <Tabs
            defaultValue="outline"
            className={cn("flex w-full flex-col justify-start gap-6", className)}
        >
            <div className="flex flex-col gap-4 px-4 lg:px-6">
                {title ? (
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                    </div>
                ) : null}
                <div className="flex items-center justify-between">
                    <div className="flex items-center relative gap-2">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search team members..."
                            value={(table.getColumn("firstname")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("firstname")?.setFilterValue(event.target.value)
                            }
                            className="max-w-md h-9 pl-9 bg-muted/20 border-border focus-visible:ring-primary/20"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {table.getFilteredSelectedRowModel().rows.length > 0 && canManageMembers ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                            >
                                <IconUserMinus className="size-4" />
                                <span className="hidden lg:inline">
                                    Remove ({table.getFilteredSelectedRowModel().rows.length})
                                </span>
                            </Button>
                        ) : null}
                        {onTeamUpdated && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onTeamUpdated()}
                                disabled={isLoading}
                                title="Refresh dashboard"
                            >
                                <IconRefresh className={cn("size-4", isLoading && "animate-spin")} />
                                <span className="hidden lg:inline">Refresh</span>
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <IconLayoutColumns />
                                    <span className="hidden lg:inline">Customize Columns</span>
                                    <span className="lg:hidden">Columns</span>
                                    <IconChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {table
                                    .getAllColumns()
                                    .filter(
                                        (column) =>
                                            typeof column.accessorFn !== "undefined" &&
                                            column.getCanHide(),
                                    )
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canManageMembers ? (
                            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <IconUserPlus />
                                        <span className="hidden lg:inline">Add Member</span>
                                        <span className="lg:hidden">Add</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-xl">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <IconUserPlus className="size-5" />
                                            </div>
                                            Add a new member
                                        </DialogTitle>
                                        <DialogDescription>
                                            Search by email to add an existing user to this team.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={emailFieldId}>Member email</Label>
                                            <Input
                                                id={emailFieldId}
                                                type="email"
                                                value={emailCandidate}
                                                onChange={(event) =>
                                                    handleEmailChange(event.target.value)
                                                }
                                                placeholder="member@email.com"
                                                autoComplete="off"
                                            />
                                            {isSearchingUser ? (
                                                <p className="text-muted-foreground text-xs">
                                                    Searching user...
                                                </p>
                                            ) : searchErrorMessage ? (
                                                <p className="text-destructive text-xs">
                                                    {searchErrorMessage}
                                                </p>
                                            ) : null}
                                        </div>
                                        {selectedUser ? (
                                            <div className="space-y-2 rounded-md border p-3 text-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">
                                                            {selectedUser.firstName}{" "}
                                                            {selectedUser.lastName}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {selectedUser.email}
                                                        </p>
                                                    </div>
                                                    {selectedUserRoleLabel ? (
                                                        <Badge
                                                            variant={
                                                                selectedUser.isAdmin
                                                                    ? "destructive"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            {selectedUserRoleLabel}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                {selectedUser.team?.description ? (
                                                    <p className="text-muted-foreground text-xs">
                                                        Current team: {selectedUser.team.description}
                                                    </p>
                                                ) : null}
                                                {selectedUser.teamManaged?.description ? (
                                                    <p className="text-muted-foreground text-xs">
                                                        Manages: {selectedUser.teamManaged.description}
                                                    </p>
                                                ) : null}
                                                {assignmentWarningMessage ? (
                                                    <p className="text-destructive text-xs">
                                                        {assignmentWarningMessage}
                                                    </p>
                                                ) : null}
                                                {cannotAssignSelectedUser ? (
                                                    <p className="text-destructive text-xs">
                                                        You need admin rights to add an admin user.
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {showTeamWarning ? (
                                            <p className="text-destructive text-xs">
                                                Target team is unknown. Contact an administrator.
                                            </p>
                                        ) : null}
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <AlertDialog
                                            open={isConfirmOpen}
                                            onOpenChange={setIsConfirmOpen}
                                        >
                                            <AlertDialogTrigger asChild>
                                                <Button disabled={isAddActionDisabled}>
                                                    {isAddingMember ? "Adding..." : "Add member"}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="flex items-center gap-2 text-xl">
                                                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                                            <IconAlertTriangle className="size-5" />
                                                        </div>
                                                        Confirm member addition
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will add {selectedUser?.firstName}{" "}
                                                        {selectedUser?.lastName} to your team. You can
                                                        remove members later if needed.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isAddingMember}>
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                        disabled={isAddingMember}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            void handleConfirmAddition();
                                                        }}
                                                    >
                                                        {isAddingMember ? "Working..." : "Confirm"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        ) : null}
                    </div>
                </div>
            </div>
            <TabsContent
                value="outline"
                className="relative flex flex-1 min-h-0 flex-col gap-4 px-4 lg:px-6"
            >
                <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                        id={sortableId}
                    >
                        <Table>
                            <TableHeader className="bg-muted sticky top-0 z-[1]">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead key={header.id} colSpan={header.colSpan}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={tableColumns.length}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Loading team members...
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    <SortableContext
                                        items={dataIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {table.getRowModel().rows.map((row) => (
                                            <DraggableRow key={row.id} row={row} />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={tableColumns.length}
                                            className="h-24 text-center"
                                        >
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
                <div className="flex items-center justify-between px-4">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value));
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-20"
                                    id={`${rowId}-rows-per-page`}
                                >
                                    <SelectValue
                                        placeholder={table.getState().pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to last page</span>
                                <IconChevronsRight />
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6">
                <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
            </TabsContent>
            <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
                <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
            </TabsContent>
            <AlertDialog
                open={isBulkDeleteConfirmOpen}
                onOpenChange={setIsBulkDeleteConfirmOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                                <IconUserMinus className="size-5" />
                            </div>
                            Remove team members
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <strong>
                                {table.getFilteredSelectedRowModel().rows.length} members
                            </strong>{" "}
                            from this team? This action can be reverted by adding them back later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isBulkDeleting}
                            onClick={async (e) => {
                                e.preventDefault();
                                setIsBulkDeleting(true);
                                try {
                                    const selectedRows = table.getFilteredSelectedRowModel().rows;
                                    await Promise.all(
                                        selectedRows.map((row) =>
                                            updateUser({
                                                variables: {
                                                    id: String(row.original.id),
                                                    teamId: null,
                                                },
                                            }),
                                        ),
                                    );
                                    toast.success(
                                        `${selectedRows.length} members have been removed from the team.`,
                                    );
                                    setRowSelection({});
                                    if (onTeamUpdated) {
                                        await onTeamUpdated();
                                    }
                                    setIsBulkDeleteConfirmOpen(false);
                                } catch (error) {
                                    const message =
                                        error instanceof Error
                                            ? error.message
                                            : "Failed to remove some members from the team.";
                                    toast.error(message);
                                } finally {
                                    setIsBulkDeleting(false);
                                }
                            }}
                        >
                            {isBulkDeleting ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Tabs>
    );
}
