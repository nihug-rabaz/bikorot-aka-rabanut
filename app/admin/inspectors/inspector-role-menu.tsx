"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { updateInspectorRole } from "./actions"

interface InspectorRoleMenuProps {
  inspectorId: string
  currentRole: string
}

export function InspectorRoleMenu({ inspectorId, currentRole }: InspectorRoleMenuProps) {
  const router = useRouter()

  const handleSelect = async (role: string) => {
    if (role === currentRole) return
    await updateInspectorRole(inspectorId, role)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <MoreVertical className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>הרשאה</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentRole} onValueChange={handleSelect}>
          <DropdownMenuRadioItem value="INSPECTOR">
            מבקר
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ADMIN">
            אדמין
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
