"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const steps = [
    "gathering video data..",
    "generating agent profiles...",
    "simulating metrics..",
    "completed."
  ];

  const [stepIndex, setStepIndex] = useState(0);

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
              animate={{
                height: [
                  "20%",
                  `${40 + Math.random() * 60}%`,
                  "20%"
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1
              }}
              style={{ height: "20px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
