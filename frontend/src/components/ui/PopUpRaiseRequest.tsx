import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardFooter } from "./card";
import { Label } from "./label";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { useAuth } from "@/contexts/AuthContext";
import { gql } from "@apollo/client";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Calendar, Clock, X, Check, FileText, Loader2 } from "lucide-react";

export function PopUpRaiseRequest({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();

  const [day, setDay] = useState("");
  const [newClockIn, setNewClockIn] = useState("");
  const [newClockOut, setNewClockOut] = useState("");
  const [description, setDescription] = useState("");

  // Helper: normalize server times
  const normalizeTime = (t?: string | null) => {
    if (!t) return "";
    const parts = t.split(":");
    if (parts.length >= 2)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return t;
  };

  const normalizeDay = (d?: string | null) => {
    if (!d) return "";
    // strip time part if present (e.g. 2026-01-08T00:00:00)
    return d.split("T")[0];
  };

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

  // lazy query to fetch time clock entries (we'll filter client-side by user and day)
  const [
    fetchTimeClocks,
    { data: timeClocksData, loading: timeClocksLoading },
  ] = useLazyQuery<TimeClocksData>(GET_TIME_CLOCKS_QUERY, {
    fetchPolicy: "network-only",
  });

  const [createRequest, { loading }] = useMutation(CREATE_REQUEST_MUTATION);

  const handleSubmit = async () => {
    if (!user) return;

    // Ensure we have the TimeClock entry for this user/day — the server requires it.
    const result = await fetchTimeClocks();
    const fetched = result?.data as TimeClocksData | undefined;
    const matching =
      fetched?.timeClocks.find(
        (tc) =>
          String(tc.user?.id) === String(user.id) &&
          normalizeDay(tc.day) === normalizeDay(day)
      ) ?? null;

    if (!matching) {
      toast.error(
        "No TimeClock entry found for the selected day. Cannot create a request."
      );
      return;
    }

    try {
      await createRequest({
        variables: {
          day,
          description,
          newClockIn,
          newClockOut,
        },
      });
      toast.success("Request created successfully.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create request");
      return;
    }

    setDay("");
    setNewClockIn("");
    setNewClockOut("");
    setDescription("");
    // close the popup if parent provided a handler
    onClose?.();
  };

  // When day changes, fetch timeClocks and pick the entry for that day (if any)
  useEffect(() => {
    if (!day || !user) return;
    console.log("Fetching timeClocks for day:", day, "user:", user.id);
    void fetchTimeClocks();
  }, [day, user, fetchTimeClocks]);

  // helpful derived values for display/debug
  useEffect(() => {
    if (timeClocksData?.timeClocks) {
      console.log("All timeClocks received:", timeClocksData.timeClocks);
      console.log("Current user ID:", user?.id, "type:", typeof user?.id);
      console.log("Selected day:", day, "normalized:", normalizeDay(day));

      timeClocksData.timeClocks.forEach((tc, idx) => {
        console.log(`TimeClock[${idx}]:`, {
          id: tc.id,
          userId: tc.user?.id,
          userIdType: typeof tc.user?.id,
          day: tc.day,
          dayNormalized: normalizeDay(tc.day),
          clockIn: tc.clockIn,
          clockOut: tc.clockOut,
          userMatch: String(tc.user?.id) === String(user?.id),
          dayMatch: normalizeDay(tc.day) === normalizeDay(day),
        });
      });
    }
  }, [timeClocksData, user, day]);

  const matchedEntry =
    timeClocksData?.timeClocks.find(
      (tc) =>
        String(tc.user?.id) === String(user?.id) &&
        normalizeDay(tc.day) === normalizeDay(day)
    ) ?? null;

  console.log("matchedEntry:", matchedEntry);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => onClose?.()}
      />

      <Card className="w-full max-w-3xl mx-auto z-10 shadow-2xl border-2 border-slate-200/50 dark:border-slate-700/50 max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Create Time Modification Request
              </CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onClose?.()}
              className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div
          className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Date Selection Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full sm:w-auto min-w-[200px] h-10"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDay(new Date().toISOString().slice(0, 10))}
                  className="flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDay(d.toISOString().slice(0, 10));
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Yesterday
                </Button>
              </div>
            </div>
          </div>

          {/* Time Changes Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Changes
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Times (read-only) */}
              <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Original Times
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2">
                      Clock In
                    </Label>
                    {timeClocksLoading ? (
                      <div className="h-10 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <Input
                        type="text"
                        value={normalizeTime(matchedEntry?.clockIn ?? "")}
                        disabled
                        placeholder="--:--"
                        className="h-10 font-mono text-base text-center bg-slate-100 dark:bg-slate-800"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2">
                      Clock Out
                    </Label>
                    {timeClocksLoading ? (
                      <div className="h-10 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <Input
                        type="text"
                        value={normalizeTime(matchedEntry?.clockOut ?? "")}
                        disabled
                        placeholder="--:--"
                        className="h-10 font-mono text-base text-center bg-slate-100 dark:bg-slate-800"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* New Times (editable) */}
              <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="default" className="text-xs bg-green-600">
                    New
                  </Badge>
                  <span className="text-xs text-green-900 dark:text-green-100 font-medium uppercase tracking-wide">
                    Requested Times
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-green-900 dark:text-green-100 mb-2">
                      Clock In
                    </Label>
                    <Input
                      type="time"
                      value={newClockIn}
                      onChange={(e) => setNewClockIn(e.target.value)}
                      className="h-10 font-mono text-base border-green-300 dark:border-green-700"
                      placeholder="HH:MM"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-green-900 dark:text-green-100 mb-2">
                      Clock Out
                    </Label>
                    <Input
                      type="time"
                      value={newClockOut}
                      onChange={(e) => setNewClockOut(e.target.value)}
                      className="h-10 font-mono text-base border-green-300 dark:border-green-700"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the reason for this time modification request..."
              className="w-full resize-y rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              rows={4}
            />
          </div>
        </div>

        <CardFooter className="border-t bg-slate-50 dark:bg-slate-900/50 p-6 gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onClose?.()}
            className="flex-1 sm:flex-none"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !day || !newClockIn || !newClockOut}
            className="flex-1 sm:flex-none"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default PopUpRaiseRequest;
