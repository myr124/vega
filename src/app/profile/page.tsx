import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    const email = user.email ?? "";
    const name =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        email.split("@")[0] ||
        "User";

    const avatarUrl = (user.user_metadata as any)?.avatar_url as string | undefined;

    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-indigo-900 to-gray-900 text-white">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

                <Card className="bg-black/60 border-white/20">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-purple-400">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback className="text-lg">
                                {email?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl">{name}</CardTitle>
                            <CardDescription className="text-white/70">{email}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                        <form action={signOut}>
                            <Button type="submit" variant="secondary">
                                Sign out
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
