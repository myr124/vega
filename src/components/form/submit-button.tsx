"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { useFormStatus } from "react-dom"
import { cn } from "@/lib/utils"

type Props = {
    children: React.ReactNode
    pendingText?: string
    className?: string
    variant?: React.ComponentProps<typeof Button>["variant"]
    size?: React.ComponentProps<typeof Button>["size"]
}

export function SubmitButton({
    children,
    pendingText,
    className,
    variant,
    size,
}: Props) {
    const { pending } = useFormStatus()

    return (
        <Button
            type="submit"
            variant={variant}
            size={size}
            className={cn("w-full", className)}
            disabled={pending}
            aria-disabled={pending}
            aria-busy={pending}
        >
            {pending ? pendingText ?? "Submitting..." : children}
        </Button>
    )
}
