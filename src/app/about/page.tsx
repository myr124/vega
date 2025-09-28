"use client";

import { Button } from "@/components/ui/button";
import { Github, Star, Zap, Brain, Users, Rocket, Video, Bot, FileText, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
    return (
        <>
            <main className="min-h-screen text-foreground relative">
                {/* Header */}
                <div className="absolute top-4 left-4 z-10">
                    <Link href="/">
                        <Button variant="outline" size="sm" className="bg-black/50 backdrop-blur-sm">
                            ← Back to Home
                        </Button>
                    </Link>
                </div>

                {/* Hero Section */}
                <section className="flex flex-col items-center justify-center min-h-screen px-8 text-center pt-20">
                    <div className="mb-12">
                        <Image src="/shellhacks.svg" height={230} width={230} alt="Vega Icon" className="mx-auto mb-6" />
                        <h1 className="text-5xl md:text-6xl font-extrabold uppercase mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                            About Vega
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            Revolutionary AI-powered video analysis platform that simulates 
                            <span className="text-purple-400 font-semibold"> real human viewers</span> to provide 
                            unprecedented insights into video content engagement and effectiveness.
                        </p>
                    </div>

                    {/* Project Overview */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 max-w-4xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-3">
                            <Sparkles className="text-purple-400" />
                            How Vega Works
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">1. Video Upload</h3>
                                <p className="text-sm text-muted-foreground">
                                    Upload your video content through our secure, authenticated interface
                                </p>
                            </div>
                            <div className="text-center">
                                <Bot className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">2. AI Agent Analysis</h3>
                                <p className="text-sm text-muted-foreground">
                                    24 specialized AI agents simulate diverse viewer personas and analyze content simultaneously
                                </p>
                            </div>
                            <div className="text-center">
                                <FileText className="w-16 h-16 text-pink-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">3. Comprehensive Report</h3>
                                <p className="text-sm text-muted-foreground">
                                    Receive detailed insights on engagement, effectiveness, and audience response patterns
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Technical Architecture */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
                        {/* Frontend */}
                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
                            <h3 className="text-2xl font-bold mb-4 text-purple-300">Frontend Architecture</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-400" />
                                    <span><strong>Next.js 15</strong> with App Router & Turbopack</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-pink-400" />
                                    <span><strong>React 19</strong> with modern hooks & concurrent features</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-purple-400" />
                                    <span><strong>Tailwind CSS</strong> for responsive, cosmic-themed UI</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-indigo-400" />
                                    <span><strong>Framer Motion</strong> for smooth animations & transitions</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-green-400" />
                                    <span><strong>Supabase Auth</strong> with OAuth integration</span>
                                </li>
                            </ul>
                        </div>

                        {/* Backend */}
                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
                            <h3 className="text-2xl font-bold mb-4 text-indigo-300">Backend & AI Engine</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-purple-400" />
                                    <span><strong>Google ADK 1.15.1</strong> for AI agent orchestration</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Rocket className="w-4 h-4 text-blue-400" />
                                    <span><strong>Gemini 2.0 Flash</strong> for lightning-fast video processing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-green-400" />
                                    <span><strong>Multi-Agent System</strong> with 24 parallel viewer personas</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-yellow-400" />
                                    <span><strong>FastAPI</strong> backend with async processing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-pink-400" />
                                    <span><strong>FFmpeg</strong> integration for video processing</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* AI Agent System */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 max-w-5xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold mb-6 text-center">
                            <Brain className="inline w-8 h-8 mr-2 text-purple-400" />
                            Intelligent Multi-Agent System
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xl font-semibold mb-4 text-purple-300">Agent Pipeline</h4>
                                <ol className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                                        <span><strong>Video Transcriber:</strong> Complete audio-to-text conversion with speaker identification</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                                        <span><strong>Transcript Summarizer:</strong> Key content extraction and context analysis</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                                        <span><strong>24 Reviewer Agents:</strong> Parallel analysis from diverse viewer perspectives</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                                        <span><strong>Synthesis Agent:</strong> Comprehensive report generation and insights</span>
                                    </li>
                                </ol>
                            </div>
                            <div>
                                <h4 className="text-xl font-semibold mb-4 text-indigo-300">Viewer Personas</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="bg-purple-500/20 rounded p-2">
                                        <strong>Demographics:</strong> Age groups, cultural backgrounds, education levels
                                    </div>
                                    <div className="bg-indigo-500/20 rounded p-2">
                                        <strong>Interests:</strong> Tech enthusiasts, casual viewers, subject matter experts
                                    </div>
                                    <div className="bg-pink-500/20 rounded p-2">
                                        <strong>Viewing Styles:</strong> Critical analyzers, entertainment seekers, learners
                                    </div>
                                    <div className="bg-green-500/20 rounded p-2">
                                        <strong>Engagement Patterns:</strong> Active participants, passive consumers, social sharers
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                            <Zap className="w-12 h-12 text-yellow-400 mb-4 mx-auto" />
                            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
                            <p className="text-sm text-muted-foreground">
                                Powered by Gemini for rapid video processing and real-time insights
                            </p>
                        </div>

                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                            <Users className="w-12 h-12 text-indigo-400 mb-4 mx-auto" />
                            <h3 className="text-lg font-semibold mb-2">Multi-Perspective Analysis</h3>
                            <p className="text-sm text-muted-foreground">
                                25+ AI agents simulate diverse viewer demographics and engagement patterns
                            </p>
                        </div>

                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                            <Brain className="w-12 h-12 text-purple-400 mb-4 mx-auto" />
                            <h3 className="text-lg font-semibold mb-2">Deep Insights</h3>
                            <p className="text-sm text-muted-foreground">
                                Advanced AI understanding of context, emotion, and audience engagement
                            </p>
                        </div>
                    </div>

                    {/* GitHub Section */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 max-w-3xl mx-auto mb-10">
                        <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
                            <Star className="w-8 h-8 text-yellow-400" />
                            Built for ShellHacks 2025
                        </h2>
                        <p className="text-muted-foreground mb-6 text-center max-w-2xl mx-auto"> 
                            Explore our codebase or fork it to create your own AI-powered video analysis platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button 
                                asChild
                                size="lg"
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                            >
                                <a href="https://github.com/myr124/vega" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <Github className="w-5 h-5" />
                                    View on GitHub
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center py-8 text-muted-foreground bg-black/20">
                    <p className="italic mb-2">✨ Built with passion for ShellHacks 2025 ✨</p>
                    <p className="text-sm">Empowering creators with AI-driven video insights</p>
                </footer>
            </main>
        </>
    );
}
