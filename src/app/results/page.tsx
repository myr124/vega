"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

function toNum(value: any): number | undefined {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (!Number.isNaN(n)) return n;
    }
    return undefined;
}

function tryParseLLMJson(input: unknown): unknown {
    try {
        if (typeof input !== "string") return input;
        let s = input.trim();

        // Handle markdown code fences
        const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch) {
            s = fenceMatch[1].trim();
        }

        // Trim to first {...} block if extra text surrounds it
        const firstBrace = s.indexOf("{");
        const lastBrace = s.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            s = s.slice(firstBrace, lastBrace + 1);
        }

        return JSON.parse(s);
    } catch {
        return input;
    }
}

function normalizeLLMPayload(json: any): any {
    let obj = json;

    // If entire payload is a JSON string (with escaped \n etc), parse it
    if (typeof obj === "string") {
        obj = tryParseLLMJson(obj);
    }

    // If shape is { result: "..." }, parse the string result
    if (obj && typeof obj === "object" && typeof obj.result === "string") {
        const parsed = tryParseLLMJson(obj.result);
        if (parsed && typeof parsed === "object") {
            obj = { ...obj, result: parsed };
        }
    }

    // Now get the final payload (either obj.result or obj)
    let payload: any = (obj?.result ?? obj);

    // If payload is a string JSON, parse it
    if (typeof payload === "string") {
        const p = tryParseLLMJson(payload);
        if (p && typeof p === "object") payload = p;
    }

    // Unwrap cases like { output: "{...}" } from LLMs
    if (payload && typeof payload === "object" && typeof (payload as any).output === "string") {
        const p = tryParseLLMJson((payload as any).output);
        if (p && typeof p === "object") payload = p;
    }

    // Some fields themselves might be JSON strings — parse them
    if (payload && typeof payload === "object") {
        if (typeof payload.video === "string") {
            const p = tryParseLLMJson(payload.video);
            if (p && typeof p === "object") payload.video = p;
        }
        if (typeof payload.metrics === "string") {
            const p = tryParseLLMJson(payload.metrics);
            if (p && typeof p === "object") payload.metrics = p;
        }
        if (typeof payload.personas === "string") {
            const p = tryParseLLMJson(payload.personas);
            if (Array.isArray(p)) payload.personas = p;
        }
    }

    // Coerce numeric string fields to numbers to fix rendering when LLM returns numbers as strings
    if (payload && typeof payload === "object") {
        if (payload.metrics && typeof payload.metrics === "object") {
            const m = payload.metrics as any;
            const mKeys = [
                "estimated_view_count",
                "estimated_like_count",
                "estimated_dislike_count",
                "avg_retention_rate",
                "avg_watch_time_sec",
                "viewing_likelihood",
                "like_probability",
                "dislike_probability",
            ];
            for (const k of mKeys) {
                const n = toNum(m[k]);
                if (typeof n === "number") m[k] = n;
            }
        }
        if (Array.isArray(payload.personas)) {
            for (const p of payload.personas as any[]) {
                if (!p || typeof p !== "object") continue;
                const keys = [
                    "predicted_view_count",
                    "predicted_retention_rate",
                    "predicted_like_probability",
                    "predicted_dislike_probability",
                ];
                for (const k of keys) {
                    const n = toNum((p as any)[k]);
                    if (typeof n === "number") (p as any)[k] = n;
                }
            }
        }
    }

    return payload;
}

type ResultData = {
    video?: {
        title?: string;
        category?: string;
        length_sec?: number;
    };
    metrics?: {
        estimated_view_count?: number;
        estimated_like_count?: number;
        estimated_dislike_count?: number;
        avg_retention_rate?: number;
        avg_watch_time_sec?: number;
        viewing_likelihood?: number;
        like_probability?: number;
        dislike_probability?: number;
    };
    personas?: Array<{
        name?: string;
        vertical?: string;
        level?: string;
        randomized_reviewer_name?: string;
        key_observations?: string[];
        predicted_view_count?: number;
        predicted_retention_rate?: number;
        predicted_like_probability?: number;
        predicted_dislike_probability?: number;
    }>;
    audience_segments?: any[];
    target_demographics?: any[];
    retention?: {
        high_retention_segments?: string[];
        low_retention_segments?: string[];
        key_dropoff_timestamps_sec?: number[];
    };
    suggestions?: {
        top_actions?: string[];
        thumbnail_titles_to_test?: string[];
        hook_scripts?: string[];
    };
    advertising?: {
        suitable_sponsors?: string[];
        ad_formats?: string[];
        integration_ideas?: string[];
    };
    methodology?: {
        notes?: string;
        assumptions?: string[];
    };
} | null;

function pct(val?: number): string {
    if (typeof val !== "number" || Number.isNaN(val)) return "—";
    const p = val > 1 ? val : val * 100;
    return `${Math.round(p)}%`;
}

function fmtDuration(sec?: number): string {
    if (typeof sec !== "number" || Number.isNaN(sec)) return "—";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
}

export default function Results() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<ResultData>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasInputs = useMemo(() => {
        return (
            !!searchParams.get("prompt") ||
            !!searchParams.get("video_uri") ||
            !!searchParams.get("video_object_url")
        );
    }, [searchParams]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                setLoading(true);
                setError(null);

                const prompt = searchParams.get("prompt") || "";
                const videoUri = searchParams.get("video_uri") || "";
                const videoObjectUrl = searchParams.get("video_object_url") || "";
                const videoName = searchParams.get("video_name") || "upload.mp4";

                if (!prompt && !videoUri && !videoObjectUrl) {
                    setError("No input provided. Please start the analysis from the home page.");
                    return;
                }

                const formData = new FormData();
                if (prompt) formData.append("prompt", prompt);
                if (videoUri) {
                    formData.append("video_uri", videoUri);
                } else if (videoObjectUrl) {
                    const res = await fetch(videoObjectUrl);
                    const blob = await res.blob();
                    const file = new File([blob], videoName, { type: blob.type || "video/mp4" });
                    formData.append("video", file, videoName);
                    URL.revokeObjectURL(videoObjectUrl);
                }

                const resp = await fetch("/api/adk", { method: "POST", body: formData });
                const json = await resp.json();

                if (cancelled) return;

                if (!resp.ok || json?.ok === false) {
                    setError(json?.error || "Request failed");
                    return;
                }

                const payload = normalizeLLMPayload(json);
                setData(payload as ResultData);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Unexpected error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-gray-900">
                <LoadingScreen />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-8 bg-gradient-to-br from-indigo-900 to-gray-900 text-white">
                <div className="max-w-3xl mx-auto">
                    <Card className="bg-black/60 border-white/20">
                        <CardHeader>
                            <CardTitle>Error</CardTitle>
                            <CardDescription>We couldn't complete the simulation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-300">{error}</p>
                            {!hasInputs && (
                                <p className="text-white/60 mt-2">Tip: Use the home page to choose a video or prompt, then click Start Analysis.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const title = data?.video?.title || "- Untitled Video -";
    const metrics = data?.metrics || {};
    const personas = data?.personas || [];

    const viewingLikelihood = metrics.viewing_likelihood;
    const avgRetentionRate = metrics.avg_retention_rate;
    const avgWatchTimeSec = metrics.avg_watch_time_sec;
    const likeProb = metrics.like_probability;
    const dislikeProb = metrics.dislike_probability;

    return (
        <div className="min-h-screen p-8 relative z-[100] bg-gradient-to-br from-indigo-900 to-gray-900">
            {/* Video Title */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">
                    {title} — Audience Agent Simulation Results
                </h1>
                {data?.video?.category && (
                    <p className="text-white/60 text-sm">Category: {data.video.category}</p>
                )}
            </div>

            {/* Top Metrics using Card components */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                {/* Views / Viewing Likelihood */}
                <Card className="bg-black/60 border-white/20 text-center">
                    <CardHeader>
                        <CardTitle className="text-white/80 text-sm">Viewing Likelihood</CardTitle>
                        <CardDescription className="text-white/60 text-xs">
                            Probability that users click and start watching
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white mb-2">{pct(viewingLikelihood)}</div>
                        <p className="text-white/60 text-xs">
                            Estimated views: {typeof metrics.estimated_view_count === "number" ? metrics.estimated_view_count.toLocaleString() : "—"}
                        </p>
                    </CardContent>
                </Card>

                {/* Average Watch Time / Retention */}
                <Card className="bg-black/60 border-white/20 text-center">
                    <CardHeader>
                        <CardTitle className="text-white/80 text-sm">Watch Time</CardTitle>
                        <CardDescription className="text-white/60 text-xs">
                            Average amount of time users would watch your video
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white mb-2">{fmtDuration(avgWatchTimeSec)}</div>
                        <p className="text-white/60 text-xs">
                            Average retention rate: {pct(avgRetentionRate)}
                        </p>
                    </CardContent>
                </Card>

                {/* Like / Dislike */}
                <Card className="bg-black/60 border-white/20 text-center">
                    <CardHeader>
                        <CardTitle className="text-white/80 text-sm">Like / Dislike</CardTitle>
                        <CardDescription className="text-white/60 text-xs">
                            Audience sentiment balance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white mb-2">{pct(likeProb)}</div>
                        <p className="text-white/60 text-xs">Like probability</p>
                        <p className="text-white/40 text-xs mt-1">Dislike probability: {pct(dislikeProb)}</p>
                        <div className="text-white/60 text-xs mt-2">
                            Likes: {typeof metrics.estimated_like_count === "number" ? metrics.estimated_like_count.toLocaleString() : "—"} ·
                            Dislikes: {typeof metrics.estimated_dislike_count === "number" ? metrics.estimated_dislike_count.toLocaleString() : "—"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Personas */}
            <div className="max-w-6xl mx-auto">
                <h2 className="text-white text-lg text-center mb-8">
                    See what some of our agent profiles think about your video
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {(personas.slice(0, 4)).map((p, idx) => (
                        <Card key={idx} className="bg-black/60 border-purple-500/30">
                            <CardHeader>
                                <CardTitle className="text-purple-400 text-xl font-semibold">
                                    {p?.name || p?.randomized_reviewer_name || `Persona ${idx + 1}`}
                                </CardTitle>
                                {(p?.vertical || p?.level) && (
                                    <CardDescription className="text-white/60">
                                        {[p.vertical, p.level].filter(Boolean).join(" • ")}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-white/80">
                                    <p>Viewing likelihood: <span className="text-white font-semibold">{pct(p?.predicted_like_probability)}</span></p>
                                    <p>Retention: <span className="text-white font-semibold">{pct(p?.predicted_retention_rate)}</span></p>
                                    {Array.isArray(p?.key_observations) && p!.key_observations!.length > 0 && (
                                        <div className="text-white/70 mt-3">
                                            <p className="text-sm font-semibold text-white/80 mb-1">Key observations:</p>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                {p!.key_observations!.slice(0, 4).map((obs, i) => (
                                                    <li key={i}>{obs}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
