"use client";

import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type RequestRow = {
  id: string;
  date: string;
  lastName: string;
  firstName: string;
  dateRequest: string;
  clockIn: string;
  clockOut: string;
  status: "Présent" | "Absent";
};

const sampleData: RequestRow[] = [
  {
    id: "1",
    date: "01/01/2025",
    lastName: "TIZAOUI",
    firstName: "Yassin",
    dateRequest: "12/12/2025",
    clockIn: "08h32",
    clockOut: "08h32",
    status: "Présent",
  },
  {
    id: "2",
    date: "01/01/2025",
    lastName: "JACQUEMOT",
    firstName: "Paul",
    dateRequest: "12/12/2025",
    clockIn: "08h35",
    clockOut: "08h35",
    status: "Présent",
  },
  {
    id: "3",
    date: "01/01/2025",
    lastName: "HABES",
    firstName: "Rayan",
    dateRequest: "12/12/2025",
    clockIn: "08h32",
    clockOut: "08h32",
    status: "Présent",
  },
  {
    id: "4",
    date: "01/01/2025",
    lastName: "MERON",
    firstName: "Arnaud",
    dateRequest: "12/12/2025",
    clockIn: "08h32",
    clockOut: "08h32",
    status: "Absent",
  },
];

export default function ManagerDashboard() {
  const [rows] = React.useState<RequestRow[]>(sampleData);

  return (
    <div className="p-6">
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle>Manage Time Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Date_request</TableHead>
                <TableHead>Clock_In</TableHead>
                <TableHead>Clock_Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.date}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {r.lastName}
                  </TableCell>
                  <TableCell className="text-sm">{r.firstName}</TableCell>
                  <TableCell className="text-sm">{r.dateRequest}</TableCell>
                  <TableCell className="text-sm">{r.clockIn}</TableCell>
                  <TableCell className="text-sm">{r.clockOut}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          r.status === "Présent"
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        )}
                      />
                      <span className="whitespace-nowrap">{r.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Button size="sm" variant="outline">
                        Valider
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-variant="destructive">
                            Refuser
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Détails de la demande
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
