"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface TextSectionProps {
  title: string
  description: string
  value: string
  onChange: (value: string) => void
}

export function TextSection({ title, description, value, onChange }: TextSectionProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="הזן טקסט כאן..."
          className="min-h-64 resize-none text-base leading-relaxed"
        />
      </CardContent>
    </Card>
  )
}
