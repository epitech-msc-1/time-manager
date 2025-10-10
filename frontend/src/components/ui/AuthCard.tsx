import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card'
import { cn } from '@/lib/utils'

type AuthCardProps = React.PropsWithChildren<{
  title: string
  description?: string
  className?: string
}>

export default function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center px-4', className)}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
