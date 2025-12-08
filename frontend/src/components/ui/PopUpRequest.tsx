import { type JSX } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./card";
import { Label } from "./label";
import { Button } from "./button";
import { useAuth } from "@/contexts/AuthContext";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

// PopUpRequest: modal that displays all pending requests

export function PopUpRequest(): JSX.Element {
  const { user } = useAuth();
  console.log("Current user:", user);

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
      <div className="absolute inset-0 bg-black/60" onClick={() => {}} />

      <Card className="w-full max-w-2xl mx-auto z-10">
        <CardHeader className="flex items-center justify-center text-center">
          <div>
            <CardTitle className="text-2xl md:text-2xl">
              {data?.allRequests.map((item) => {
                return (
                  <div key={item.id}>
                    <p>Request number: {item.id}</p>
                  </div>
                );
              })}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Clock In</Label>
                <div className="mt-1 text-lg font-medium">
                  {data?.allRequests.map((item) => {
                    return (
                      <div key={item.id}>
                        <p>{item.oldClockIn}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm">Clock Out </Label>
                <div className="mt-1 text-lg font-medium">
                  {data?.allRequests.map((item) => {
                    return (
                      <div key={item.id}>
                        <p>{item.oldClockOut}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm">New Clock In</Label>
                <div className="mt-1 text-lg font-medium">
                  {data?.allRequests.map((item) => {
                    return (
                      <div key={item.id}>
                        <p>{item.newClockIn}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm">New Clock Out</Label>
                <div className="mt-1 text-lg font-medium">
                  {data?.allRequests.map((item) => {
                    return (
                      <div key={item.id}>
                        <p>{item.newClockOut}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-base font-medium">Description</Label>
            <div className="mt-2 max-h-40 overflow-auto text-base leading-relaxed whitespace-pre-wrap">
              {data?.allRequests.map((item) => {
                return (
                  <div key={item.id}>
                    <p>{item.description}</p>
                  </div>
                );
              }) ?? "No description provided."}
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <Button variant="default" size="default" onClick={() => {}}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default PopUpRequest;
