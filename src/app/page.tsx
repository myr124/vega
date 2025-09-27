"use client";




import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";



export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [video, setVideo] = useState<File | null>(null);
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        setResponse("");

        const formData = new FormData();
        if (prompt) {
            formData.append("prompt", prompt);
        }
        if (video) {
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
            <h1 className="text-6xl font-bold uppercase text-center mb-4">ENGAGE AUDIENCES EASILY</h1>
            <p className="text-2xl text-center mb-8 text-muted-foreground">AI agents that deliver real-world results</p>
            <div className="w-full max-w-2xl">
                <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
                    <div className="flex">
                        <input
                            type="text"
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            // change this to make it not a text input. make it a file input that accepts video files
                            className="flex-1 px-4 py-[1.75rem] bg-background border-r border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="No File Chosen. MAX 1GB .mov .mp4 only"
                        />
                        <input
                            type="file"
                            id="video"
                            accept="video/*"
                            onChange={(e) => setVideo(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        <label htmlFor="video" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-[1.75rem] cursor-pointer border-l border-border flex items-center whitespace-nowrap">
                            <Upload></Upload>
                        </label>
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 py-[1.75rem] px-8 whitespace-nowrap">
                        {loading ? (
                            <>
                                <div className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-primary rounded-full animate-spin mr-2"></div>
                                Searching...
                            </>
                        ) : (
                            "Search"
                        )}
                    </Button>
                </div>
                {video && (
                    <p className="text-sm text-muted-foreground mt-2 w-full max-w-2xl">Selected: {video.name} (Max 1GB)</p>
                )}
                {response && (
                    <div className="mt-4 p-3 bg-muted rounded-md border border-border w-full max-w-2xl">
                        <p className="text-sm text-foreground">{response}</p>
                    </div>
                )}


            </div>
        </main>
    );
}
