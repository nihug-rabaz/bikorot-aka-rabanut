"use client"

import { useState, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InspectorOption } from "../types"

interface InspectorMultiSelectProps {
  inspectors: InspectorOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  placeholder?: string
}

export function InspectorMultiSelect({
  inspectors,
  selectedIds,
  onToggle,
  placeholder = "בחר מבקר/ים",
}: InspectorMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return inspectors
    const q = search.trim().toLowerCase()
    return inspectors.filter((i) => i.name.toLowerCase().includes(q))
  }, [inspectors, search])

  const selectedNames = inspectors
    .filter((i) => selectedIds.includes(i.id))
    .map((i) => i.name)
    .join(", ")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 w-full justify-between text-base font-normal",
            !selectedNames && "text-muted-foreground"
          )}
          aria-label={placeholder}
        >
          <span className="flex items-center gap-2 truncate">
            <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {selectedNames || placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="חיפוש מבקר..."
            aria-label="חיפוש מבקרים"
          />
          <CommandList>
            <CommandEmpty>לא נמצאו מבקרים</CommandEmpty>
            <CommandGroup>
              {filtered.map((inspector) => {
                const checked = selectedIds.includes(inspector.id)
                return (
                  <CommandItem
                    key={inspector.id}
                    value={inspector.id}
                    onSelect={() => onToggle(inspector.id)}
                    className="cursor-pointer gap-2"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(inspector.id)}
                      aria-label={inspector.name}
                    />
                    <span>{inspector.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
