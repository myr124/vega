import { createClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { SubmitButton } from "@/components/form/submit-button"

export const dynamic = "force-dynamic"

async function signUp(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    })

    if (error) {
        redirect(`/signup?message=${encodeURIComponent(error.message)}`)
    }

    redirect("/protected")
}

export default async function Signup({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>
}) {
    const { message } = await searchParams

    return (
        <div className="mx-auto w-full max-w-5xl p-6">
            {message ? (
                <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {decodeURIComponent(message)}
                </div>
            ) : null}

            <div className="grid gap-6 max-w-md mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Create account</CardTitle>
                        <CardDescription>Start your journey</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={signUp} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                            </div>
                            <SubmitButton className="w-full" pendingText="Creating account...">
                                Sign Up
                            </SubmitButton>
                        </form>
                    </CardContent>
                </Card>
                <p className="mt-4 text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <a className="text-primary underline-offset-4 hover:underline" href="/login">
                        Log in
                    </a>
                </p>
            </div>
        </div>
    )
}
