"use client";

import { Clock } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
    date?: Date;
    setDate?: (date: Date) => void;
    value?: string; // HH:MM format
    onChange?: (time: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

    const [selectedHour, selectedMinute] = value ? value.split(":") : ["--", "--"];

    const handleTimeChange = (type: "hour" | "minute", val: string) => {
        if (!onChange) return;

        let newHour = selectedHour === "--" ? "00" : selectedHour;
        let newMinute = selectedMinute === "--" ? "00" : selectedMinute;

        if (type === "hour") {
            newHour = val;
        } else {
            newMinute = val;
        }

        onChange(`${newHour}:${newMinute}`);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className,
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {value ? value : "Pick a time"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <div className="flex h-[300px] divide-x">
                    <div className="flex flex-col p-2">
                        <div className="mb-2 text-center text-xs font-semibold">Hours</div>
                        <div
                            className="h-full w-[60px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-1 pr-1">
                                {hours.map((hour) => (
                                    <Button
                                        key={hour}
                                        variant={selectedHour === hour ? "default" : "ghost"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleTimeChange("hour", hour)}
                                    >
                                        {hour}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col p-2">
                        <div className="mb-2 text-center text-xs font-semibold">Minutes</div>
                        <div
                            className="h-full w-[60px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-1 pr-1">
                                {minutes.map((minute) => (
                                    <Button
                                        key={minute}
                                        variant={selectedMinute === minute ? "default" : "ghost"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleTimeChange("minute", minute)}
                                    >
                                        {minute}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
