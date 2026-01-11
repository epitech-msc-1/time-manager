"use client";

import { gql } from "@apollo/client";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { format } from "date-fns";
import { CalendarIcon, Check, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const GET_TIME_CLOCKS_QUERY = gql`
  query TimeClocks {
    timeClocks {
      id
      user {
        id
      }
      day
      clockIn
      clockOut
    }
  }
`;

const CREATE_REQUEST_MUTATION = gql`
  mutation CreateRequest(
    $day: Date!
    $description: String
    $newClockIn: Time!
    $newClockOut: Time!
  ) {
    createRequestModifyTimeClock(
      day: $day
      description: $description
      newClockIn: $newClockIn
      newClockOut: $newClockOut
    ) {
      request {
        id
      }
    }
  }
`;

type TimeClockEntry = {
    id: string;
    user: { id: string };
    day: string; // serialized date YYYY-MM-DD
    clockIn?: string | null;
    clockOut?: string | null;
};

type TimeClocksData = {
    timeClocks: TimeClockEntry[];
};

export default function PopUpRaiseRequest({ onClose }: { onClose?: () => void }) {
    const { user } = useAuth();
    const [date, setDate] = useState<Date | undefined>();
    const [newClockIn, setNewClockIn] = useState("");
    const [newClockOut, setNewClockOut] = useState("");
    const [description, setDescription] = useState("");
    const [isOpen, setIsOpen] = useState(true);

    // Helper: normalize server times
    const normalizeTime = (t?: string | null) => {
        if (!t) return "";
        const parts = t.split(":");
        if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        return t;
    };

    const normalizeDay = (d?: string | null) => {
        if (!d) return "";
        return d.split("T")[0];
    };

    const [fetchTimeClocks, { data: timeClocksData, loading: timeClocksLoading }] =
        useLazyQuery<TimeClocksData>(GET_TIME_CLOCKS_QUERY, {
            fetchPolicy: "network-only",
        });

    const [createRequest, { loading }] = useMutation(CREATE_REQUEST_MUTATION);

    const handleClose = () => {
        setIsOpen(false);
        // Add a small delay to allow the dialog animation to finish before unmounting if dependent on external state
        setTimeout(() => onClose?.(), 300);
    };

    useEffect(() => {
        if (date && user) {
            const dayStr = format(date, "yyyy-MM-dd");
            console.log("Fetching timeClocks for day:", dayStr, "user:", user.id);
            void fetchTimeClocks();
        }
    }, [date, user, fetchTimeClocks]);

    const matchedEntry =
        timeClocksData?.timeClocks.find((tc) => {
            if (!date) return false;
            const currentDayStr = format(date, "yyyy-MM-dd");
            return (
                String(tc.user?.id) === String(user?.id) && normalizeDay(tc.day) === currentDayStr
            );
        }) ?? null;

    const handleSubmit = async () => {
        if (!user || !date) return;

        if (!matchedEntry) {
            toast.error("No TimeClock entry found for the selected day. Cannot create a request.");
            return;
        }

        try {
            await createRequest({
                variables: {
                    day: format(date, "yyyy-MM-dd"),
                    description,
                    newClockIn,
                    newClockOut,
                },
            });
            toast.success("Request created successfully.");
            handleClose();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create request");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        Create Modification Request
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Date Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Select Date</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[240px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDate(new Date())}
                                >
                                    Today
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - 1);
                                        setDate(d);
                                    }}
                                >
                                    Yesterday
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Current Times */}
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/40">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary">Current</Badge>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Clock In
                                    </Label>
                                    {timeClocksLoading ? (
                                        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
                                    ) : (
                                        <Input
                                            value={normalizeTime(matchedEntry?.clockIn ?? "")}
                                            disabled
                                            className="font-mono text-center bg-background"
                                            placeholder="--:--"
                                        />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Clock Out
                                    </Label>
                                    {timeClocksLoading ? (
                                        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
                                    ) : (
                                        <Input
                                            value={normalizeTime(matchedEntry?.clockOut ?? "")}
                                            disabled
                                            className="font-mono text-center bg-background"
                                            placeholder="--:--"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* New Times */}
                        <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="default" className="bg-primary hover:bg-primary/90">
                                    New
                                </Badge>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium text-primary">
                                        New Clock In
                                    </Label>
                                    <TimePicker
                                        value={newClockIn}
                                        onChange={setNewClockIn}
                                        className="border-primary/30 bg-background"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium text-primary">
                                        New Clock Out
                                    </Label>
                                    <TimePicker
                                        value={newClockOut}
                                        onChange={setNewClockOut}
                                        className="border-primary/30 bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Description</Label>
                            <span className="text-xs text-muted-foreground">
                                {description.length}/144
                            </span>
                        </div>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            placeholder="Reason for modification..."
                            maxLength={144}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !date || !newClockIn || !newClockOut}
                        className="gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
