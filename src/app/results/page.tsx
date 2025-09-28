"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
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

function sanitizeJsonLikeString(s: string): string {
    let out = "";
    let inString = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inString) {
            if (escape) {
                out += ch;
                escape = false;
                continue;
            }
            if (ch === "\\") {
                out += ch;
                escape = true;
                continue;
            }
            if (ch === '"') {
                let j = i + 1;
                while (j < s.length && /\s/.test(s[j])) j++;
                if (j >= s.length || [",", "}", "]", ":"].includes(s[j])) {
                    out += ch;
                    inString = false;
                } else {
                    out += '\\"';
                }
                continue;
            }
            out += ch;
        } else {
            if (ch === '"') {
                out += ch;
                inString = true;
            } else {
                out += ch;
            }
        }
    }
    return out;
}

function tryParseJsonLike(input: unknown): any {
    if (typeof input !== "string") return input;
    // Reuse tryParseLLMJson first (handles fences and trimming)
    const firstPass = tryParseLLMJson(input);
    if (firstPass && typeof firstPass === "object") return firstPass;
    // If still string or failed, attempt sanitizer for inner quotes
    try {
        return JSON.parse(sanitizeJsonLikeString(String(input)));
    } catch {
        return input;
    }
}

function normalizeLLMPayload(json: any): any {
    let obj = json;

    // If entire payload is a JSON string (with escaped \n etc), parse it
    if (typeof obj === "string") {
        obj = tryParseJsonLike(obj);
    }

    // If shape is { result: "..." }, parse the string result
    if (obj && typeof obj === "object" && typeof obj.result === "string") {
        const parsed = tryParseJsonLike(obj.result);
        if (parsed && typeof parsed === "object") {
            obj = { ...obj, result: parsed };
        }
    }

    // Now get the final payload (either obj.result or obj)
    let payload: any = (obj?.result ?? obj);

    // If payload is a string JSON, parse it
    if (typeof payload === "string") {
        const p = tryParseJsonLike(payload);
        if (p && typeof p === "object") payload = p;
    }

    // Unwrap cases like { output: "..."/{...} } from LLMs
    if (payload && typeof payload === "object") {
        const out: any = (payload as any).output;
        if (typeof out === "string") {
            const p = tryParseJsonLike(out);
            if (p && typeof p === "object") payload = p;
        } else if (out && typeof out === "object") {
            payload = out;
        }
    }

    // Some fields themselves might be JSON strings — parse them
    if (payload && typeof payload === "object") {
        if (typeof payload.video === "string") {
            const p = tryParseJsonLike(payload.video);
            if (p && typeof p === "object") payload.video = p;
        }
        if (typeof payload.metrics === "string") {
            const p = tryParseJsonLike(payload.metrics);
            if (p && typeof p === "object") payload.metrics = p;
        }
        if (typeof payload.personas === "string") {
            const p = tryParseJsonLike(payload.personas);
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

/* Helpers for Lottie avatars */
type AvatarManifest = string[];

function normalizeAvatarPath(item: string): string {
    if (!item) return "";
    // Absolute URL (CDN etc.)
    if (/^https?:\/\//i.test(item)) return item;
    // Already absolute path, leave as-is
    if (item.startsWith("/")) return item;
    const cleaned = item.replace(/^\/+/, "");
    // If already starts with "avatars/", just ensure leading slash
    if (cleaned.startsWith("avatars/")) return `/${cleaned}`;
    return `/avatars/${cleaned}`;
}

function pickAvatar(seed: number, list: AvatarManifest): string | null {
    if (!Array.isArray(list) || list.length === 0) return null;
    const n = Math.abs(Math.floor(seed));
    const rand = (n % 233280) / 233280;
    const i = Math.floor(rand * list.length);
    return normalizeAvatarPath(list[i]);
}

function HoverLottieAvatar({ src, playing, size = 48 }: { src: string; playing?: boolean; size?: number }) {
    const [data, setData] = useState<unknown | null>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const r = await fetch(src);
                const json = await r.json();
                if (!cancelled) setData(json);
            } catch {
                // ignore
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [src]);

    useEffect(() => {
        const inst = lottieRef.current;
        if (!inst) return;
        if (playing) {
            inst.play();
        } else {
            inst.stop();
        }
    }, [playing]);

    return (
        <div
            className="rounded-full overflow-hidden bg-gray-300 shrink-0 flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {data ? (
                <Lottie
                    lottieRef={lottieRef}
                    animationData={data}
                    loop={true}
                    autoplay={false}
                    style={{ width: size, height: size }}
                />
            ) : null}
        </div>
    );
}

export default function Results() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<ResultData>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [avatarList, setAvatarList] = useState<AvatarManifest>([]);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const avatarSeed = useMemo(() => {
        try {
            const key = "avatarSeed";
            const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
            if (existing) {
                const n = parseInt(existing, 10);
                if (!Number.isNaN(n)) return n;
            }
            const s = Math.floor(Math.random() * 1e9);
            if (typeof window !== "undefined") window.localStorage.setItem(key, String(s));
            return s;
        } catch {
            return Math.floor(Math.random() * 1e9);
        }
    }, []);

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

    useEffect(() => {
        let cancelled = false;
        async function loadManifest() {
            try {
                const api = await fetch("/api/avatars", { cache: "no-store" });
                let arr: unknown = await api.json();
                if (!Array.isArray(arr) || arr.length === 0) {
                    const r = await fetch("/avatars/manifest.json", { cache: "no-store" });
                    arr = await r.json();
                }
                if (!cancelled && Array.isArray(arr)) {
                    const list = (arr as unknown[]).filter(
                        (x: unknown) => typeof x === "string" && (x as string).trim() !== ""
                    ) as string[];
                    setAvatarList(list);
                }
            } catch {
                if (!cancelled) setAvatarList([]);
            }
        }
        loadManifest();
        return () => {
            cancelled = true;
        };
    }, []);

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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {personas.map((p, idx) => {
                        const name = p?.randomized_reviewer_name || p?.name || `Persona ${idx + 1}`;
                        const likedProb = typeof (p as any)?.predicted_like_probability === "number" ? (p as any).predicted_like_probability : undefined;
                        const retention = typeof (p as any)?.predicted_retention_rate === "number" ? (p as any).predicted_retention_rate : undefined;
                        const liked = typeof likedProb === "number" ? likedProb >= 0.5 : undefined;
                        const likedLabel = liked === undefined ? "—" : liked ? "Liked" : "Disliked";
                        const likedClass = liked === undefined ? "text-white/70" : liked ? "text-green-400" : "text-red-400";
                        const levelVertical = [(p as any)?.level, (p as any)?.vertical].filter(Boolean).join(" ");
                        const comment = Array.isArray((p as any)?.key_observations) && (p as any).key_observations!.length > 0
                            ? (p as any).key_observations![0]
                            : "No comment";

                        return (
                            <div
                                key={idx}
                                className="rounded-lg border border-purple-500/30 bg-black/70 p-4 flex items-start gap-4 hover:border-purple-400/50 transition-colors"
                                onMouseEnter={() => setHoverIdx(idx)}
                                onMouseLeave={() => setHoverIdx((prev) => (prev === idx ? null : prev))}
                            >
                                {/* Avatar */}
                                {(() => {
                                    const avatarUrl = pickAvatar(avatarSeed + idx, avatarList);
                                    return avatarUrl ? (
                                        <HoverLottieAvatar src={avatarUrl} playing={hoverIdx === idx} />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-300 shrink-0" />
                                    );
                                })()}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-semibold text-lg tracking-wide">
                                        <span className="uppercase">{name}</span>
                                        <span className="mx-1"> - </span>
                                        <span className={likedClass}>{likedLabel}</span>
                                        <span className="mx-1">, </span>
                                        <span className="text-white/80">{pct(retention)} watched</span>
                                    </div>
                                    <div className="italic text-white/70">
                                        {levelVertical || "—"}
                                    </div>

                                    {/* Divider */}
                                    <div className="mt-1 h-px w-full bg-white/20" />

                                    {/* Comment */}
                                    <div className="mt-3 text-white/80 text-base">
                                        <span className="text-white/70">“</span>
                                        <span>{comment}</span>
                                        <span className="text-white/70">”</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
