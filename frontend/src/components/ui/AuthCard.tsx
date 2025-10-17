import type * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

type AuthCardProps = React.PropsWithChildren<{
    title: string;
    description?: string;
    className?: string;
}>;

export default function AuthCard({ title, description, children, className }: AuthCardProps) {
    return (
        <div
            className={cn(
                "flex min-h-[100vh] items-center justify-center px-4 py-12 sm:py-20",
                className,
            )}
        >
            <div className="w-full max-w-md mx-auto z-10">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        {description ? (
                            <CardDescription className="text-sm text-muted-foreground">
                                {description}
                            </CardDescription>
                        ) : null}
                    </CardHeader>
                    <CardContent>{children}</CardContent>
                </Card>
            </div>
        </div>
    );
}
