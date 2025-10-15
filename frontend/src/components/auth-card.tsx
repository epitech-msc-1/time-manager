import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReactNode } from "react"

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-[100vh] items-center justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md mx-auto z-10">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
            {description && (
              <CardDescription className="text-center text-sm text-muted-foreground">{description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
