"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
    AlertCircle,
    Calendar,
    Check,
    Clock,
    Eye,
    FileBarChart2,
    FileText,
    MoreHorizontal,
    Search,
    Trash2,
    X,
} from "lucide-react";
import type { CSSProperties } from "react";
import * as React from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { ExportDialog } from "@/components/export-dialog";
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
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const ALL_REQUESTS_QUERY = gql`
  query AllRequests {
    allRequests {
      id
      day
      description
      newClockIn
      newClockOut
      oldClockOut
      oldClockIn
      currentDate
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

const ACCEPT_REQUEST_MUTATION = gql`
  mutation AcceptRequest($requestId: ID!, $accepted: Boolean!) {
    acceptedChangeRequest(requestId: $requestId, accepted: $accepted) {
      message
    }
  }
`;

type RequestUser = {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
};

type RequestItem = {
    id: string;
    day: string;
    description?: string | null;
    newClockIn?: string | null;
    newClockOut?: string | null;
    oldClockIn?: string | null;
    oldClockOut?: string | null;
    currentDate?: string | null;
    user?: RequestUser | null;
};

type AllRequestsData = {
    allRequests: RequestItem[];
};

export default function ManagerDashboard(): React.JSX.Element {
    const { data, loading, error, refetch } = useQuery<AllRequestsData>(ALL_REQUESTS_QUERY, {
        fetchPolicy: "network-only",
    });

    const [exportDialogState, setExportDialogState] = React.useState<{
        isOpen: boolean;
        userId?: string;
        userName?: string;
    }>({ isOpen: false });

    function handleExportPdf(userId?: string, userName?: string) {
        if (!userId) {
            toast.error("Cannot export report: User ID is missing");
            return;
        }
        setExportDialogState({ isOpen: true, userId, userName });
    }

    type AcceptRequestData = {
        acceptedChangeRequest?: {
            message?: string | null;
        } | null;
    };

    type AcceptRequestVars = {
        requestId: string;
        accepted: boolean;
    };

    const [acceptRequest, { loading: acceptLoading }] = useMutation<
        AcceptRequestData,
        AcceptRequestVars
    >(ACCEPT_REQUEST_MUTATION, {
        onCompleted: (res) => {
            const msg = res?.acceptedChangeRequest?.message;
            toast.success(msg ?? "Request updated");
            void refetch();
        },
        onError: (err) => {
            console.error("Accept/Refuse failed", err);
            toast.error("Unable to update request");
        },
    });

    const [selected, setSelected] = React.useState<RequestItem | null>(null);
    const [itemToApprove, setItemToApprove] = React.useState<RequestItem | null>(null);
    const [itemToReject, setItemToReject] = React.useState<RequestItem | null>(null);
    const [searchTerm, setSearchTerm] = React.useState("");

    const filteredRequests = React.useMemo(() => {
        const requests = data?.allRequests ?? [];
        if (!searchTerm) return requests;
        const lowerTerm = searchTerm.toLowerCase();
        return requests.filter((req) => {
            const fullName =
                `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.toLowerCase();
            const email = (req.user?.email ?? "").toLowerCase();
            const dateStr = (req.currentDate ?? req.day).toLowerCase();
            return (
                fullName.includes(lowerTerm) ||
                email.includes(lowerTerm) ||
                dateStr.includes(lowerTerm)
            );
        });
    }, [data?.allRequests, searchTerm]);

    function handleValidate(id: string) {
        void acceptRequest({ variables: { requestId: id, accepted: true } });
    }

    function handleRefuse(id: string) {
        void acceptRequest({ variables: { requestId: id, accepted: false } });
    }

    function openDetails(item: RequestItem) {
        setSelected(item);
    }

    function closeDetails() {
        setSelected(null);
    }

    function formatDate(dateStr?: string | null) {
        if (!dateStr) return "-";
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch (_e) {
            return dateStr;
        }
    }

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
                <SiteHeader title="Manager Dashboard" />
                <div className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6">
                        <Card className="mx-4 sm:mx-6 shadow-sm">
                            <CardHeader>
                                <CardTitle>Time Entry Requests</CardTitle>
                                <CardDescription>
                                    Manage and review employee time clock adjustment requests.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-4">
                                <div className="flex items-center py-4 relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search requests by employee, email, or date..."
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        className="max-w-md pl-9 bg-muted/20 border-border focus-visible:ring-primary/20"
                                    />
                                </div>
                                {loading && (
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-8 w-1/3" />
                                            <Skeleton className="h-8 w-20" />
                                        </div>
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        <p className="text-destructive mb-2">
                                            Failed to load requests
                                        </p>
                                        <Button variant="outline" onClick={() => refetch()}>
                                            Retry
                                        </Button>
                                    </div>
                                )}

                                {!loading && !error && filteredRequests.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        {searchTerm
                                            ? "No requests found matching your search."
                                            : "No pending requests found."}
                                    </div>
                                )}

                                {!loading && !error && filteredRequests.length > 0 && (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Request Date</TableHead>
                                                <TableHead>Old In</TableHead>
                                                <TableHead>Old Out</TableHead>
                                                <TableHead className="text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRequests.map((req) => (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>
                                                                {formatDate(
                                                                    req.currentDate ?? req.day,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                                                                {(
                                                                    req.user?.firstName?.[0] ?? ""
                                                                ).toUpperCase()}
                                                                {(
                                                                    req.user?.lastName?.[0] ?? ""
                                                                ).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {req.user?.firstName}{" "}
                                                                    {req.user?.lastName}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {req.user?.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatDate(req.day)}</TableCell>
                                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                                        {req.oldClockIn ?? (
                                                            <span className="text-muted-foreground/50">
                                                                -
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                                        {req.oldClockOut ?? (
                                                            <span className="text-muted-foreground/50">
                                                                -
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="hidden sm:flex gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                disabled={acceptLoading}
                                                                onClick={() =>
                                                                    setItemToApprove(req)
                                                                }
                                                            >
                                                                <Check className="h-4 w-4" />
                                                                Approve
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                        <span className="sr-only">
                                                                            Open menu
                                                                        </span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    className="w-56"
                                                                >
                                                                    <DropdownMenuLabel>
                                                                        Actions
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleExportPdf(
                                                                                req.user?.id,
                                                                                `${req.user?.firstName} ${req.user?.lastName}`,
                                                                            )
                                                                        }
                                                                    >
                                                                        <FileBarChart2 className="h-4 w-4" />
                                                                        Export Report
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            openDetails(req)
                                                                        }
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            setItemToApprove(req)
                                                                        }
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                        Approve Request
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            setItemToReject(req)
                                                                        }
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Reject Request
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                            <CardFooter className="border-t bg-muted/40 px-6 py-4">
                                <div className="text-xs text-muted-foreground">
                                    Showing {filteredRequests.length} pending requests
                                </div>
                            </CardFooter>
                        </Card>

                        <Dialog open={!!selected} onOpenChange={(open) => !open && closeDetails()}>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        Request Details
                                    </DialogTitle>
                                    <DialogDescription>
                                        Review the changes requested by the employee.
                                    </DialogDescription>
                                </DialogHeader>

                                {selected && (
                                    <div className="grid gap-6 py-4">
                                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {(
                                                    selected.user?.firstName?.[0] ?? ""
                                                ).toUpperCase()}
                                                {(selected.user?.lastName?.[0] ?? "").toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">
                                                    {selected.user?.firstName}{" "}
                                                    {selected.user?.lastName}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {selected.user?.email}
                                                </p>
                                            </div>
                                            <div className="ml-auto flex flex-col items-end">
                                                <Badge
                                                    variant="outline"
                                                    className="flex items-center gap-1"
                                                >
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        selected.currentDate ?? selected.day,
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                                                <h4 className="flex items-center font-semibold gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-4 w-4" /> Original Times
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                                            In
                                                        </div>
                                                        <div className="font-mono text-sm">
                                                            {selected.oldClockIn ?? "—"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                                            Out
                                                        </div>
                                                        <div className="font-mono text-sm">
                                                            {selected.oldClockOut ?? "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 rounded-lg border p-4 border-primary/20 bg-primary/5">
                                                <h4 className="flex items-center font-semibold gap-2 text-sm text-primary">
                                                    <Clock className="h-4 w-4" /> Requested Changes
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                                            In
                                                        </div>
                                                        <div className="font-mono text-sm font-semibold">
                                                            {selected.newClockIn ?? "—"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                                            Out
                                                        </div>
                                                        <div className="font-mono text-sm font-semibold">
                                                            {selected.newClockOut ?? "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">
                                                Reason for Request
                                            </h4>
                                            <div className="p-3 bg-muted rounded-md text-sm italic text-muted-foreground border">
                                                {selected.description
                                                    ? `"${selected.description}"`
                                                    : "No description provided."}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <DialogFooter className="gap-2 sm:gap-2">
                                    <Button variant="outline" onClick={closeDetails}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-destructive/50 hover:bg-destructive/10 text-destructive hover:text-destructive"
                                        onClick={() => {
                                            if (selected) setItemToReject(selected);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (selected) setItemToApprove(selected);
                                        }}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Check className="h-4 w-4" />
                                        Confirm
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <AlertDialog
                            open={!!itemToApprove}
                            onOpenChange={(open) => !open && setItemToApprove(null)}
                        >
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
                                            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        Confirm Approval
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to approve this request for{" "}
                                        {itemToApprove?.user?.firstName}{" "}
                                        {itemToApprove?.user?.lastName}?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => {
                                            if (itemToApprove) {
                                                handleValidate(itemToApprove.id);
                                                if (selected?.id === itemToApprove.id)
                                                    closeDetails();
                                                setItemToApprove(null);
                                            }
                                        }}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        Confirm Approval
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog
                            open={!!itemToReject}
                            onOpenChange={(open) => !open && setItemToReject(null)}
                        >
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="p-2 rounded-lg bg-destructive/10">
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                        </div>
                                        Confirm Rejection
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to reject this request for{" "}
                                        {itemToReject?.user?.firstName}{" "}
                                        {itemToReject?.user?.lastName}? This action cannot be
                                        undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => {
                                            if (itemToReject) {
                                                handleRefuse(itemToReject.id);
                                                if (selected?.id === itemToReject.id)
                                                    closeDetails();
                                                setItemToReject(null);
                                            }
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Confirm Rejection
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <ExportDialog
                    isOpen={exportDialogState.isOpen}
                    onClose={() => setExportDialogState({ ...exportDialogState, isOpen: false })}
                    userId={exportDialogState.userId}
                    userName={exportDialogState.userName}
                    defaultStartDate={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                    defaultEndDate={
                        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                    }
                />
            </SidebarInset>
        </SidebarProvider>
    );
}
