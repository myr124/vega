"use client";




import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";



export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [video, setVideo] = useState<File | null>(null);
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const sb = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setVideo(f);
        setVideoUri(null);
        if (!f) return;

        setUploading(true);

        const ext = f.name.split(".").pop() || "mp4";
        const path = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await sb.storage.from("videos").upload(path, f, {
            contentType: f.type || "video/mp4",
            upsert: false,
        });

        if (error) {
            setResponse(`Upload failed: ${error.message}`);
            setUploading(false);
            return;
        }

        let url = sb.storage.from("videos").getPublicUrl(path).data.publicUrl;
        try {
            const { data: signed } = await sb.storage
                .from("videos")
                .createSignedUrl(path, 60 * 60 * 24); // 24h
            if (signed?.signedUrl) {
                url = signed.signedUrl;
            }
        } catch {
            // ignore, use publicUrl fallback
        }

        setVideoUri(url);
        setUploading(false);
        console.log("Uploaded video URL:", url);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setResponse("");

        const formData = new FormData();
        if (prompt) {
            formData.append("prompt", prompt);
        }
        if (videoUri) {
            formData.append("video_uri", videoUri);
        } else if (video) {
            // Fallback to direct file upload if URI isn't ready
            formData.append("video", video, video.name);
        }

        try {
            const res = await fetch("/api/adk", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.ok) {
                setResponse(data.result || "Success!");
            } else {
                setResponse(`Error: ${data.error}`);
            }
        } catch (error) {
            setResponse("Request failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 text-foreground">
            <h1 className="text-6xl font-bold uppercase text-center mb-4 fade-in">ENGAGE AUDIENCES EASILY</h1>
            <p className="text-2xl text-center mb-8 text-muted-foreground fade-in">AI agents that deliver real-world results</p>
            <div className="w-full max-w-2xl fade-in">
                <div className="rounded-[20px] border-black shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] overflow-hidden mb-4">
                    <div className="flex">
                        <input
                            type="text"
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="flex-1 px-4 py-[1.75rem] bg-[#43253480] border-r border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary opacity-70"
                            placeholder="Search for AI agents or enter your query..."
                        />
                        <input
                            type="file"
                            id="video"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="video" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-[1.75rem] cursor-pointer border-l border-border flex items-center whitespace-nowrap">
                            <Upload></Upload>
                        </label>
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button onClick={handleSubmit} disabled={loading || uploading || (!prompt && !videoUri && !video)} className="bg-primary text-primary-foreground hover:bg-primary/90 py-[1.75rem] px-8 whitespace-nowrap">
                        {loading ? (
                            <>
                                <div className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-primary rounded-full animate-spin mr-2"></div>
                                Searching...
                            </>
                        ) : (
                            "Simulate"
                        )}
                    </Button>
                </div>
                {video && (
                    <p className="text-sm text-muted-foreground mt-2 w-full max-w-2xl">Selected: {video.name} (Max 1GB)</p>
                )}
                {uploading && (
                    <p className="text-sm text-muted-foreground mt-1 w-full max-w-2xl">Uploading video to cloud...</p>
                )}
                {videoUri && (
                    <p className="text-xs text-muted-foreground mt-1 w-full max-w-2xl break-all">Uploaded URL: {videoUri}</p>
                )}
                {response && (
                    <div className="mt-4 p-3 bg-muted rounded-md border border-border w-full max-w-2xl fade-in">
                        <p className="text-sm text-foreground">{response}</p>
                    </div>
                )}


            </div>
        </main>
    );
}
