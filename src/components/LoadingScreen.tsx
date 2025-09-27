"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
    const steps = [
        "Gathering video data..",
        "generating agent profiles...",
        "Simulating metrics..",
        "Almost Done."
    ];

    const [stepIndex, setStepIndex] = useState(0);
    const barConfigs = useMemo(
        () =>
            Array.from({ length: 20 }, (_, i) => ({
                // Deterministic variation per bar to avoid re-renders restarting animations
                max: 28 + (Math.sin(i * 1.7) + 1) * 28, // ~28px to ~84px
                delay: i * 0.06,
            })),
        []
    );

    // Cycle through steps every 3 seconds
    useEffect(() => {
        if (stepIndex < steps.length - 1) {
            const timer = setTimeout(() => setStepIndex(stepIndex + 1), 3000);
            return () => clearTimeout(timer);
        } else if (onComplete) {
            // Call callback when done
            onComplete();
        }
    }, [stepIndex, onComplete]);

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-900 to-gray-900">
            <div className="bg-black/80 rounded-xl px-10 py-8 text-center text-purple-200 shadow-xl">
                {/* Step text */}
                <p className="text-lg mb-6 transition-opacity duration-700">
                    {steps[stepIndex]}
                </p>

                {/* Animated bars */}
                <div className="flex items-end justify-center gap-[3px]">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-2 bg-purple-900 rounded-sm"
                            initial={{ height: 12 }}
                            animate={{ height: [12, barConfigs[i].max, 12] }}
                            transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "easeInOut",
                                delay: barConfigs[i].delay
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
