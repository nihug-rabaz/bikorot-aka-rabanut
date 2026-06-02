"use client"

import { type FormEvent, useRef, useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addInspector } from "./actions"
import { INSPECTOR_ROLES, getInspectorRoleLabel } from "./inspector-roles"

export function AddInspectorForm() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [emailError, setEmailError] = useState("")
    const [personalNumberError, setPersonalNumberError] = useState("")
    const formRef = useRef<HTMLFormElement>(null)

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        setEmailError("")
        setPersonalNumberError("")

        startTransition(async () => {
            const result = await addInspector(formData)
            if (!result?.ok) {
                if (result?.field === "email") setEmailError(result.error ?? "")
                if (result?.field === "personalNumber") setPersonalNumberError(result.error ?? "")
                toast.error(result?.error ?? "לא ניתן היה להוסיף את המבקר.", { duration: 2000 })
                return
            }

            formRef.current?.reset()
            toast.success(result.message ?? "המבקר התווסף בהצלחה.", { duration: 2000 })
            router.refresh()
        })
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
                <Input name="name" placeholder="שם המבקר" className="flex-1" required />
                <div className="flex-1 space-y-1">
                    <Input name="email" type="email" placeholder="אימייל גוגל של המבקר" className="w-full" required />
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="flex-1 space-y-1">
                    <Input name="personalNumber" placeholder="מספר אישי" className="w-full" required />
                    {personalNumberError && <p className="text-xs text-destructive">{personalNumberError}</p>}
                </div>
                <select name="role" className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {INSPECTOR_ROLES.map((role) => (
                        <option key={role} value={role}>
                            {getInspectorRoleLabel(role)}
                        </option>
                    ))}
                </select>
                <Button type="submit" className="gap-2 px-6" disabled={isPending}>
                    <UserPlus className="size-4" />
                    {isPending ? "שומר..." : "הוסף"}
                </Button>
            </div>
        </form>
    )
}
