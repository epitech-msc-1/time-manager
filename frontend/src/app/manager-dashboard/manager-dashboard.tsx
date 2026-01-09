"use client";

import * as React from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Badge removed: status will be represented by a single colored dot
import { MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Eye, Check, X, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";

// GraphQL query/mutation matching backend schema (schema_timeClock.py)
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
  const { data, loading, error, refetch } = useQuery<AllRequestsData>(
    ALL_REQUESTS_QUERY,
    {
      fetchPolicy: "network-only",
    }
  );

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

  return (
    <>
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
          <div className="p-6">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle>Manage Time Requests</CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                {loading && (
                  <div className="p-6">
                    <Skeleton className="h-8 mb-4 w-1/3" />
                    <Skeleton className="h-48" />
                  </div>
                )}

                {error && (
                  <div className="p-6 text-destructive">
                    Failed to load requests.
                  </div>
                )}

                {!loading && !error && (
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Date_request</TableHead>
                        <TableHead>Clock_In</TableHead>
                        <TableHead>Clock_Out</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.allRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {req.currentDate ?? req.day}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {req.user?.lastName ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {req.user?.firstName ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">{req.day}</TableCell>
                          <TableCell className="text-sm">
                            {req.oldClockIn ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {req.oldClockOut ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Button
                                size="sm"
                                disabled={acceptLoading}
                                onClick={() => handleValidate(req.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md transition-all"
                              >
                                <Check className="h-4 w-4 mr-1.5" />
                                Approve
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="More"
                                    className="hover:bg-accent/10"
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    data-variant="destructive"
                                    onClick={() => handleRefuse(req.id)}
                                  >
                                    <Trash2 className="size-4 text-destructive mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openDetails(req)}
                                  >
                                    <Eye className="size-4 mr-2 text-muted-foreground" />
                                    Request Details
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

              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {data?.allRequests.length ?? 0} requests
                </div>
              </CardFooter>
            </Card>

            {selected && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={closeDetails}
                />
                <Card className="w-full max-w-2xl mx-auto z-10">
                  <CardHeader className="text-center">
                    <CardTitle>Request #{selected.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">Clock In</div>
                          <div className="mt-1 text-lg">
                            {selected.oldClockIn ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Clock Out</div>
                          <div className="mt-1 text-lg">
                            {selected.oldClockOut ?? "-"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">
                            New Clock In
                          </div>
                          <div className="mt-1 text-lg">
                            {selected.newClockIn ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            New Clock Out
                          </div>
                          <div className="mt-1 text-lg">
                            {selected.newClockOut ?? "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-base font-medium">Description</div>
                      <div className="mt-2 max-h-40 overflow-auto text-base leading-relaxed whitespace-pre-wrap">
                        {selected.description ?? "No description provided."}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-center">
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleRefuse(selected.id);
                          closeDetails();
                        }}
                        className="shadow-md hover:shadow-lg transition-all"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          handleValidate(selected.id);
                          closeDetails();
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" onClick={closeDetails}>
                        Close
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
