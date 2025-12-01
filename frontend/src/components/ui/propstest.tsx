import type { JSX } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Label } from "./label";
import { Button } from "./button";

type PopUpRequestProps = {
  requestNumber: string | number;
  clockIn: string;
  clockOut: string;
  newClockIn?: string;
  newClockOut?: string;
  description?: string;
  onClose: () => void;
};

const clockInExample = "09:00";
const clockOutExample = "17:00";
const newClockInExample = "09:30";
const newClockOutExample = "17:30";
const descriptionExample =
  "c'est a cause de yassin j'avais clock out et rentrer chez moi il m'a rappeler pour me refiler son travail.";
const requestNumberExample = 106;

export function PopUpddRequest({
  requestNumber,
  clockIn,
  clockOut,
  newClockIn,
  newClockOut,
  description,
  onClose,
}: PopUpRequestProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <Card className="w-full max-w-2xl mx-auto z-10">
        <CardHeader className="flex items-center justify-center text-center">
          <div>
            <CardTitle className="text-2xl md:text-2xl">
              Request number: #{requestNumber ?? requestNumberExample}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Clock In</Label>
                <div className="mt-1 text-lg font-medium">
                  {clockIn ?? clockInExample}
                </div>
              </div>

              <div>
                <Label className="text-sm">Clock Out</Label>
                <div className="mt-1 text-lg font-medium">
                  {clockOut ?? clockOutExample}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm">New Clock In</Label>
                <div className="mt-1 text-lg font-medium">
                  {newClockIn ?? newClockInExample ?? "-"}
                </div>
              </div>

              <div>
                <Label className="text-sm">New Clock Out</Label>
                <div className="mt-1 text-lg font-medium">
                  {newClockOut ?? newClockOutExample ?? "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-base font-medium">Description</Label>
            <div className="mt-2 max-h-40 overflow-auto text-base leading-relaxed whitespace-pre-wrap">
              {description ?? descriptionExample ?? "No description provided."}
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <Button variant="default" size="default" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default PopUpddRequest;
