"use client";

import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileBarChart2, Loader2 } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { GET_USER_BY_EMAIL } from "@/graphql/queries";
import { cn } from "@/lib/utils";

const EXPORT_PDF_QUERY = gql`
  query ExportTimeClockPdf($userId: ID, $startDate: Date, $endDate: Date, $primaryColor: String) {
    exportTimeClockPdf(userId: $userId, startDate: $startDate, endDate: $endDate, primaryColor: $primaryColor) {
      downloadUrl
      filename
    }
  }
`;

const EXPORT_CSV_QUERY = gql`
  query ExportTimeClockCsv($userId: ID, $startDate: Date, $endDate: Date) {
    exportTimeClockCsv(userId: $userId, startDate: $startDate, endDate: $endDate) {
      downloadUrl
      filename
    }
  }
`;

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
    defaultStartDate?: Date;
    defaultEndDate?: Date;
    userName?: string;
}

const EMAIL_DEBOUNCE_MS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
    return EMAIL_PATTERN.test(value.trim());
}

interface UserLookupResult {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
}

interface UserByEmailQueryResult {
    userByEmail: UserLookupResult | null;
}

interface ExportResult {
    downloadUrl: string;
    filename: string;
}

interface ExportPdfQueryResult {
    exportTimeClockPdf: ExportResult;
}

interface ExportCsvQueryResult {
    exportTimeClockCsv: ExportResult;
}

export function ExportDialog({
    isOpen,
    onClose,
    userId: initialUserId,
    defaultStartDate,
    defaultEndDate,
    userName: initialUserName,
}: ExportDialogProps) {
    const { user: authUser } = useAuth();
    const dateButtonId = React.useId();
    const userSearchId = React.useId();
    const isPrivileged = authUser?.isAdmin || authUser?.isManager;

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: defaultStartDate,
        to: defaultEndDate,
    });
    const [exportFormat, setExportFormat] = React.useState<"pdf" | "csv">("pdf");

    // Search state
    const [searchEmail, setSearchEmail] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState<UserLookupResult | null>(null);
    const [searchError, setSearchError] = React.useState<string | null>(null);

    const [fetchUserByEmail, { loading: searchLoading }] = useLazyQuery<UserByEmailQueryResult>(
        GET_USER_BY_EMAIL,
        {
            fetchPolicy: "network-only",
        },
    );

    const [triggerPdf, { loading: pdfLoading }] = useLazyQuery<ExportPdfQueryResult>(
        EXPORT_PDF_QUERY,
        {
            fetchPolicy: "network-only",
        },
    );
    const [triggerCsv, { loading: csvLoading }] = useLazyQuery<ExportCsvQueryResult>(
        EXPORT_CSV_QUERY,
        {
            fetchPolicy: "network-only",
        },
    );

    const loading = pdfLoading || csvLoading;

    const handleExport = () => {
        if (!date?.from) {
            toast.error("Please select a start date.");
            return;
        }

        // Normalize dates
        const startDate = format(date.from, "yyyy-MM-dd");
        const endDate = date.to ? format(date.to, "yyyy-MM-dd") : startDate;

        let primaryColorHash = "#e11d48"; // fallback

        if (exportFormat === "pdf") {
            try {
                // Create a temporary element to resolve the variable first
                const tempDiv = document.createElement("div");
                tempDiv.style.color = "var(--primary)";
                tempDiv.style.display = "none";
                document.body.appendChild(tempDiv);
                const computedStyle = getComputedStyle(tempDiv).color;
                document.body.removeChild(tempDiv);

                // Use Canvas to force conversion of any color format (oklch, etc.) to RGB
                const canvas = document.createElement("canvas");
                canvas.height = 1;
                canvas.width = 1;
                const ctx = canvas.getContext("2d");

                if (ctx && computedStyle) {
                    ctx.fillStyle = computedStyle;
                    ctx.fillRect(0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

                    // Convert to Hex
                    const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
                    if (hex !== "#000000" && hex !== "#00000000") {
                        primaryColorHash = hex;
                    }
                }
            } catch (e) {
                console.error("Failed to resolve theme color", e);
            }
        }

        const targetUserId = selectedUser?.id || initialUserId || authUser?.id;

        if (!targetUserId) {
            toast.error("No user selected for export.");
            return;
        }

        const handleDownload = (exportResult: ExportResult) => {
            const { downloadUrl, filename } = exportResult;
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`${exportFormat.toUpperCase()} export started`);
            onClose();
        };

        if (exportFormat === "pdf") {
            triggerPdf({
                variables: {
                    userId: targetUserId,
                    startDate,
                    endDate,
                    primaryColor: primaryColorHash,
                },
            })
                .then((result) => {
                    if (result.data?.exportTimeClockPdf) {
                        handleDownload(result.data.exportTimeClockPdf);
                    } else if (result.error) {
                        console.error("Export error:", result.error);
                        toast.error(result.error.message || "Export failed");
                    }
                })
                .catch((err) => {
                    console.error("Export exception:", err);
                    toast.error("Failed to export PDF");
                });
        } else {
            triggerCsv({
                variables: {
                    userId: targetUserId,
                    startDate,
                    endDate,
                },
            })
                .then((result) => {
                    if (result.data?.exportTimeClockCsv) {
                        handleDownload(result.data.exportTimeClockCsv);
                    } else if (result.error) {
                        console.error("Export error:", result.error);
                        toast.error(result.error.message || "Export failed");
                    }
                })
                .catch((err) => {
                    console.error("Export exception:", err);
                    toast.error("Failed to export CSV");
                });
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            if (defaultStartDate) {
                setDate({ from: defaultStartDate, to: defaultEndDate || defaultStartDate });
            }
            setSearchEmail("");
            setSelectedUser(null);
            setSearchError(null);
        }
    }, [isOpen, defaultStartDate, defaultEndDate]);

    React.useEffect(() => {
        const trimmed = searchEmail.trim();
        if (!trimmed || !isValidEmail(trimmed)) {
            setSelectedUser(null);
            return;
        }

        const timer = setTimeout(() => {
            fetchUserByEmail({ variables: { email: trimmed } })
                .then((res) => {
                    if (res.data?.userByEmail) {
                        setSelectedUser(res.data.userByEmail);
                        setSearchError(null);
                    } else {
                        setSelectedUser(null);
                        setSearchError("User not found or access denied.");
                    }
                })
                .catch((err: Error) => {
                    setSelectedUser(null);
                    setSearchError(
                        err.message.includes("Access denied")
                            ? "User not in your team."
                            : "User not found.",
                    );
                });
        }, EMAIL_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchEmail, fetchUserByEmail]);

    const displayTargetName = selectedUser
        ? `${selectedUser.firstName} ${selectedUser.lastName}`
        : initialUserName ||
          (authUser?.id === initialUserId && authUser
              ? `${authUser.firstName} ${authUser.lastName}`
              : "myself");

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileBarChart2 className="h-5 w-5 text-primary" />
                        </div>
                        Export Report
                    </DialogTitle>
                    <DialogDescription>
                        Generate a time clock report{" "}
                        {selectedUser || initialUserName
                            ? `for ${displayTargetName}`
                            : "for yourself"}
                        .
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* User Search - Only for Admins/Managers */}
                    {isPrivileged && (
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor={userSearchId} className="text-right pt-2">
                                Employee
                            </Label>
                            <div className="col-span-3 space-y-2">
                                <Input
                                    id={userSearchId}
                                    placeholder="Search by email..."
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    autoComplete="off"
                                />
                                {searchLoading && (
                                    <p className="text-xs text-muted-foreground">Searching...</p>
                                )}
                                {searchError && (
                                    <p className="text-xs text-destructive">{searchError}</p>
                                )}
                                {selectedUser && (
                                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                                        <div className="text-sm">
                                            <p className="font-medium">
                                                {selectedUser.firstName} {selectedUser.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedUser.email}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">Selected</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Format Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="format" className="text-right">
                            Format
                        </Label>
                        <Select
                            value={exportFormat}
                            onValueChange={(val: "pdf" | "csv") => setExportFormat(val)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Period</Label>
                        <div className="col-span-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id={dateButtonId}
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "LLL dd, y")} -{" "}
                                                    {format(date.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={loading || !date?.from}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
