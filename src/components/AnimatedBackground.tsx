"use client";

import { useEffect, useState } from "react";

export default function AnimatedBackground() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseEnter = () => setIsHovering(true);
        const handleMouseLeave = () => setIsHovering(false);

        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseenter', handleMouseEnter);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <>
            {/* Base gradient background */}
            <div 
                className="fixed inset-0 transition-all duration-1000 ease-out pointer-events-none"
                style={{
                    background: `
                        radial-gradient(
                            800px circle at ${mousePosition.x}px ${mousePosition.y}px,
                            rgba(139, 92, 246, ${isHovering ? '0.25' : '0.15'}) 0%,
                            rgba(168, 85, 247, ${isHovering ? '0.15' : '0.08'}) 25%,
                            rgba(147, 51, 234, ${isHovering ? '0.1' : '0.05'}) 50%,
                            transparent 70%
                        ),
                        radial-gradient(
                            1200px circle at ${mousePosition.x * 0.8}px ${mousePosition.y * 1.2}px,
                            rgba(236, 72, 153, ${isHovering ? '0.2' : '0.1'}) 0%,
                            rgba(219, 39, 119, ${isHovering ? '0.1' : '0.05'}) 30%,
                            transparent 60%
                        ),
                        linear-gradient(
                            135deg,
                            #0f0f23 0%,
                            #1a1a2e 25%,
                            #16213e 50%,
                            #0f0f23 100%
                        )
                    `,
                    zIndex: -1000
                }}
            />
            
            {/* Animated orbs that follow cursor */}
            <div 
                className="fixed w-96 h-96 rounded-full opacity-20 blur-3xl transition-all duration-700 ease-out pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
                    left: mousePosition.x - 192,
                    top: mousePosition.y - 192,
                    transform: `scale(${isHovering ? 1.3 : 1})`,
                    zIndex: -999
                }}
            />
            
            <div 
                className="fixed w-64 h-64 rounded-full opacity-30 blur-2xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%)',
                    left: mousePosition.x * 0.7 - 128,
                    top: mousePosition.y * 0.9 - 128,
                    transform: `scale(${isHovering ? 1.2 : 0.8})`,
                    zIndex: -998
                }}
            />

            {/* Subtle moving particles */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -997 }}>
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-20 animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>
        </>
    );
}