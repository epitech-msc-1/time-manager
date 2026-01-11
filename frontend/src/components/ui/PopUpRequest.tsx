import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { ArrowRight, Calendar, Clock, FileText, User, X } from "lucide-react";
import type { JSX } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardFooter, CardHeader, CardTitle } from "./card";
import { Label } from "./label";

// PopUpRequest: modal that displays all pending requests

export function PopUpRequest(): JSX.Element {
    const { user } = useAuth();
    const navigate = useNavigate();
    console.log("Current user:", user);

    const handleClose = () => {
        navigate(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClose();
        }
    };

    const popUpRequestQuery = gql`
    query {
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

    type RequestType = {
        id: string;
        day: string;
        description: string | null;
        newClockIn: string | null;
        newClockOut: string | null;
        oldClockOut: string | null;
        oldClockIn: string | null;
        currentDate: string | null;
        user?: { id: string; firstName?: string; lastName?: string } | null;
    };

    type AllRequestsData = {
        allRequests: RequestType[];
    };

    const { data } = useQuery<AllRequestsData>(popUpRequestQuery, {
        fetchPolicy: "cache-and-network",
    });
    // defensive logging
    console.log("Random Request Data count:", data?.allRequests?.length ?? 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer w-full h-full border-none p-0 m-0 focus:outline-none"
                onClick={handleClose}
                onKeyDown={handleKeyDown}
                aria-label="Close popup"
            />

            <Card className="w-full max-w-4xl mx-auto z-10 shadow-2xl border-2 border-slate-200/50 dark:border-slate-700/50 max-h-[90vh] flex flex-col overflow-hidden">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">
                                    Pending Requests
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {data?.allRequests?.length ?? 0} request(s) awaiting review
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClose}
                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <div
                    className="p-6 overflow-y-auto flex-1 scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {!data?.allRequests || data.allRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium text-muted-foreground">
                                No pending requests
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                All requests have been processed
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.allRequests.map((item: RequestType) => (
                                <div
                                    key={item.id}
                                    className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {item.user?.firstName ?? ""}{" "}
                                                    {item.user?.lastName ?? ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-200/50 dark:bg-slate-700/50">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">
                                                    {item.day}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            #{item.id}
                                        </Badge>
                                    </div>

                                    {/* Time Changes Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {/* Clock In */}
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50">
                                            <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="flex flex-col min-w-0">
                                                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                                                        Clock In
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-base font-semibold text-slate-600 dark:text-slate-300">
                                                            {item.oldClockIn ?? "--:--"}
                                                        </span>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="font-mono text-base font-bold text-green-600 dark:text-green-400">
                                                            {item.newClockIn ?? "--:--"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Clock Out */}
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50">
                                            <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="flex flex-col min-w-0">
                                                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                                                        Clock Out
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-base font-semibold text-slate-600 dark:text-slate-300">
                                                            {item.oldClockOut ?? "--:--"}
                                                        </span>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="font-mono text-base font-bold text-green-600 dark:text-green-400">
                                                            {item.newClockOut ?? "--:--"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {item.description && (
                                        <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
                                            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5" />
                                                Description
                                            </Label>
                                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 max-h-20 overflow-auto whitespace-pre-wrap">
                                                {item.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <CardFooter className="border-t bg-slate-50 dark:bg-slate-900/50 p-4 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="w-full sm:w-auto mx-auto"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Close
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default PopUpRequest;
