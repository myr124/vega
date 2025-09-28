"use client";




import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import AnimatedBackground from "@/components/AnimatedBackground";
import Image from "next/image";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [video, setVideo] = useState<File | null>(null);
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    // Initialize Supabase client
    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    // Check authentication status
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setAuthLoading(false);
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handleSignIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`
            }
        });
        if (error) {
            console.error('Error signing in:', error);
        }
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('Please sign in to analyze videos');
            return;
        }

        // Route to results page which will show the LoadingScreen and fetch data
        setResponse("");

        const params = new URLSearchParams();
        if (prompt) params.set("prompt", prompt);
        setLoading(true);
        setResponse("");
        setShowLoadingScreen(true);

        if (videoUri) {
            // Remote or previously uploaded video URL
            params.set("video_uri", videoUri);
            router.push(`/results?${params.toString()}`);
        } else if (video) {
            // Local file: pass a blob URL; results page will fetch the blob and POST to API
            const objectUrl = URL.createObjectURL(video);
            params.set("video_object_url", objectUrl);
            params.set("video_name", video.name);
            router.push(`/results?${params.toString()}`);
        } else {
            // No inputs provided
            return;
        }
    };


    // Show loading screen when processing
    if (showLoadingScreen) {
        return (
            <>
                <AnimatedBackground />
                <LoadingScreen />
            </>
        );
    }

    return (
        <>
            <AnimatedBackground />
            <main className="flex min-h-screen flex-col items-center justify-center p-8 text-foreground">
                {/* Auth Status Bar */}
                <div className="absolute top-4 right-4">
                    {authLoading ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Welcome, {user.email}
                            </span>
                            <Button 
                                onClick={handleSignOut} 
                                variant="outline" 
                                size="sm"
                            >
                                Sign Out
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            onClick={handleSignIn} 
                            variant="default" 
                            size="sm"
                        >
                            Sign In with Google
                        </Button>
                    )}
                </div>

                <div className="flex flex-col items-center" style={{ marginTop: '-6rem', marginBottom: '1.5rem' }}>
                    <Image src="shellhacks.svg" height={450} width={450} alt="Vega Icon" />
                    <h1 className="text-7xl font-extrabold uppercase text-center leading-[1.05] mb-0" style={{ letterSpacing: '-0.03em' }}>SHINE BRIGHT, GO FAR</h1>
                    <p className="text-2xl text-center text-muted-foreground leading-[1.05] mt-0 mb-0" style={{ letterSpacing: '-0.03em' }}>AI Agents that mimic real-world viewers</p>
                </div>
                <div className="w-full max-w-3xl mt-4">
                    {!authLoading && !user ? (
                        <div className="text-center py-6 px-8 bg-black/60 backdrop-blur-sm rounded-2xl border border-purple-500/30 shadow-2xl">
                            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Vega</h2>
                            <p className="text-purple-200 mb-8 italic">
                                Please sign up to access video analysis features
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Button 
                                    onClick={() => router.push('/signup')} 
                                    size="lg"
                                    className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 border-0"
                                >
                                    Sign Up
                                </Button>
                                <Button 
                                    onClick={() => router.push('/login')}
                                    size="lg"
                                    className="px-10 py-4 bg-transparent hover:bg-purple-600/20 text-purple-300 hover:text-white font-semibold rounded-xl border-2 border-purple-500 hover:border-purple-400 transition-all duration-300 transform hover:scale-105"
                                >
                                    Log In
                                </Button>
                            </div>
                        </div>
                    ) : user ? (
                        <>
                            <div className="bg-card rounded-lg border border-border overflow-hidden mb-5 mt-3">
                                <div
                                    className="flex h-10"
                                    style={{
                                        opacity: 0.7,
                                        background: "rgba(190, 183, 164, 0.50)",
                                        minWidth: '600px',
                                        maxWidth: '1000px',
                                        margin: '0 auto',
                                    }}
                                >
                                    <div className="flex flex-1 items-center">
                                        <input
                                            type="text"
                                            id="file-display"
                                            value={video ? video.name : "No File Chosen"}
                                            readOnly
                                            className="flex-1 px-4 py-2 bg-transparent border-r border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-lg"
                                            style={{ color: "var(--primary-foreground)", height: '40px' }}
                                        />
                                        <input
                                            type="file"
                                            id="video"
                                            accept="video/*"
                                            onChange={(e) => setVideo(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <label htmlFor="video" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 cursor-pointer border-l border-border flex items-center whitespace-nowrap h-10" style={{ fontSize: '1.1rem' }}>
                                            <Upload size={20} style={{ marginRight: 4 }} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <Button onClick={handleSubmit} disabled={loading || uploading || (!prompt && !videoUri && !video)} className="bg-primary text-primary-foreground hover:bg-primary/90 py-[1.75rem] px-8 whitespace-nowrap">
                                    {loading ? (
                                        <>
                                            <div className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-primary rounded-full animate-spin mr-2"></div>
                                            Analyzing..
                                        </>
                                    ) : (
                                        "Start Analysis"
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : null}
                    {response && (
                        <div className="mt-4 p-3 bg-muted rounded-md border border-border w-full max-w-2xl fade-in">
                            <p className="text-sm text-foreground">{response}</p>
                        </div>
                    )}
                    {showLoadingScreen && <LoadingScreen />}
                </div>
            </main>
        </>
    );
}
