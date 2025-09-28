"use client";




import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import AnimatedBackground from "@/components/AnimatedBackground";
import Image from "next/image";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [video, setVideo] = useState<File | null>(null);
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
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
                <div className="flex flex-col items-center" style={{ marginTop: '-6rem', marginBottom: '1.5rem' }}>
                    <Image src="shellhacks.svg" height={450} width={450} alt="Vega Icon" />
                    <h1 className="text-7xl font-extrabold uppercase text-center leading-[1.05] mb-0" style={{ letterSpacing: '-0.03em' }}>SHINE BRIGHT, GO FAR</h1>
                    <p className="text-2xl text-center text-muted-foreground leading-[1.05] mt-0 mb-0" style={{ letterSpacing: '-0.03em' }}>AI Agents that mimic real-world viewers</p>
                </div>
                <div className="w-full max-w-3xl mt-16">
                    <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
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
