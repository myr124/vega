"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Position {
    x: number;
    y: number;
}

interface Asteroid {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
}

interface Bullet {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

export default function AsteroidGame({ isActive }: { isActive: boolean }) {
    const GAME_WIDTH = 450;
    const GAME_HEIGHT = 300;
    
    const [score, setScore] = useState(0);
    const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
    const [shipPos, setShipPos] = useState<Position>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
    const [gameStarted, setGameStarted] = useState(false);
    
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const nextId = useRef(0);
    const BULLET_SPEED = 5;
    const ASTEROID_SIZES = [40, 25, 15];

    // Generate unique ID
    const getId = () => nextId.current++;

    // Create asteroid
    const createAsteroid = useCallback((x: number, y: number, size: number, vx?: number, vy?: number) => {
        return {
            id: getId(),
            x,
            y,
            vx: vx ?? (Math.random() - 0.5) * 2,
            vy: vy ?? (Math.random() - 0.5) * 2,
            size,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 4
        };
    }, []);

    // Create explosion particles
    const createExplosion = useCallback((x: number, y: number, count: number = 8) => {
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            newParticles.push({
                id: getId(),
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30,
                maxLife: 30
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    }, []);

    // Mouse move handler
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!gameAreaRef.current) return;
        const rect = gameAreaRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }, []);

    // Keyboard handlers
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', ' '].includes(key)) {
            e.preventDefault();
            setKeys(prev => ({ ...prev, [key]: true }));
            if (key === ' ' && gameStarted) {
                // Shoot on spacebar
                const angle = Math.atan2(mousePos.y - shipPos.y, mousePos.x - shipPos.x);
                const newBullet: Bullet = {
                    id: getId(),
                    x: shipPos.x,
                    y: shipPos.y,
                    vx: Math.cos(angle) * BULLET_SPEED,
                    vy: Math.sin(angle) * BULLET_SPEED
                };
                setBullets(prev => [...prev, newBullet]);
            }
        }
    }, [mousePos, shipPos, gameStarted]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        setKeys(prev => ({ ...prev, [key]: false }));
    }, []);

    // Shoot bullet
    const shoot = useCallback((e: React.MouseEvent) => {
        if (!gameStarted) {
            setGameStarted(true);
            return;
        }

        const angle = Math.atan2(mousePos.y - shipPos.y, mousePos.x - shipPos.x);
        
        const newBullet: Bullet = {
            id: getId(),
            x: shipPos.x,
            y: shipPos.y,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED
        };
        
        setBullets(prev => [...prev, newBullet]);
    }, [mousePos, shipPos, gameStarted]);

    // Collision detection
    const checkCollision = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) => {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy) < r1 + r2;
    };

    // Keyboard event listeners
    useEffect(() => {
        if (!isActive) return;
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isActive, handleKeyDown, handleKeyUp]);

    // Ship movement
    useEffect(() => {
        if (!isActive || !gameStarted) return;

        const moveShip = () => {
            setShipPos(prev => {
                let newX = prev.x;
                let newY = prev.y;
                const speed = 3;

                if (keys['a']) newX -= speed;
                if (keys['d']) newX += speed;
                if (keys['w']) newY -= speed;
                if (keys['s']) newY += speed;

                // Keep ship in bounds
                newX = Math.max(15, Math.min(GAME_WIDTH - 15, newX));
                newY = Math.max(15, Math.min(GAME_HEIGHT - 15, newY));

                return { x: newX, y: newY };
            });
        };

        const interval = setInterval(moveShip, 16); // ~60fps
        return () => clearInterval(interval);
    }, [isActive, gameStarted, keys]);

    // Game loop
    useEffect(() => {
        if (!isActive || !gameStarted) return;

        const gameLoop = () => {
            // Update bullets
            setBullets(prev => prev
                .map(bullet => ({
                    ...bullet,
                    x: bullet.x + bullet.vx,
                    y: bullet.y + bullet.vy
                }))
                .filter(bullet => 
                    bullet.x > -10 && bullet.x < GAME_WIDTH + 10 &&
                    bullet.y > -10 && bullet.y < GAME_HEIGHT + 10
                )
            );

            // Update asteroids
            setAsteroids(prev => prev.map(asteroid => ({
                ...asteroid,
                x: asteroid.x + asteroid.vx,
                y: asteroid.y + asteroid.vy,
                rotation: asteroid.rotation + asteroid.rotationSpeed,
                // Wrap around screen
                ...(asteroid.x < -asteroid.size && { x: GAME_WIDTH + asteroid.size }),
                ...(asteroid.x > GAME_WIDTH + asteroid.size && { x: -asteroid.size }),
                ...(asteroid.y < -asteroid.size && { y: GAME_HEIGHT + asteroid.size }),
                ...(asteroid.y > GAME_HEIGHT + asteroid.size && { y: -asteroid.size })
            })));

            // Update particles
            setParticles(prev => prev
                .map(particle => ({
                    ...particle,
                    x: particle.x + particle.vx,
                    y: particle.y + particle.vy,
                    life: particle.life - 1
                }))
                .filter(particle => particle.life > 0)
            );

            // Check bullet-asteroid collisions and ship collisions
            setBullets(prevBullets => {
                const remainingBullets = [...prevBullets];
                let shipHit = false;
                
                setAsteroids(prevAsteroids => {
                    const remainingAsteroids = [...prevAsteroids];
                    
                    // Check ship collision with current asteroids first
                    shipHit = remainingAsteroids.some(asteroid => 
                        checkCollision(shipPos.x, shipPos.y, 10, asteroid.x, asteroid.y, asteroid.size)
                    );
                    
                    prevBullets.forEach((bullet, bulletIndex) => {
                        prevAsteroids.forEach((asteroid, asteroidIndex) => {
                            if (checkCollision(bullet.x, bullet.y, 3, asteroid.x, asteroid.y, asteroid.size)) {
                                // Remove bullet
                                const bulletIdx = remainingBullets.findIndex(b => b.id === bullet.id);
                                if (bulletIdx !== -1) remainingBullets.splice(bulletIdx, 1);
                                
                                // Remove asteroid
                                const asteroidIdx = remainingAsteroids.findIndex(a => a.id === asteroid.id);
                                if (asteroidIdx !== -1) {
                                    remainingAsteroids.splice(asteroidIdx, 1);
                                    
                                    // Create explosion
                                    createExplosion(asteroid.x, asteroid.y);
                                    
                                    // Add score
                                    const sizeIndex = ASTEROID_SIZES.indexOf(asteroid.size);
                                    const points = (ASTEROID_SIZES.length - sizeIndex) * 10;
                                    setScore(prev => prev + points);
                                    
                                    // Break into smaller asteroids
                                    if (asteroid.size > ASTEROID_SIZES[ASTEROID_SIZES.length - 1]) {
                                        const nextSizeIndex = ASTEROID_SIZES.indexOf(asteroid.size) + 1;
                                        if (nextSizeIndex < ASTEROID_SIZES.length) {
                                            const newSize = ASTEROID_SIZES[nextSizeIndex];
                                            for (let i = 0; i < 2; i++) {
                                                remainingAsteroids.push(createAsteroid(
                                                    asteroid.x,
                                                    asteroid.y,
                                                    newSize,
                                                    (Math.random() - 0.5) * 4,
                                                    (Math.random() - 0.5) * 4
                                                ));
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                    
                    return remainingAsteroids;
                });
                
                // Handle ship collision after asteroid state is updated
                if (shipHit) {
                    // Game over - reset the game
                    setGameStarted(false);
                    setScore(0);
                    setAsteroids([]);
                    setBullets([]);
                    setParticles([]);
                    setShipPos({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
                    createExplosion(shipPos.x, shipPos.y);
                }
                
                return remainingBullets;
            });

            animationRef.current = requestAnimationFrame(gameLoop);
        };

        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, gameStarted, createAsteroid, createExplosion, asteroids, shipPos]);

    // Spawn asteroids periodically
    useEffect(() => {
        if (!isActive || !gameStarted) return;

        const spawnAsteroid = () => {
            const side = Math.floor(Math.random() * 4);
            let x, y, vx, vy;
            
            switch (side) {
                case 0: // Top
                    x = Math.random() * GAME_WIDTH;
                    y = -50;
                    vx = (Math.random() - 0.5) * 2;
                    vy = Math.random() * 2 + 0.5;
                    break;
                case 1: // Right  
                    x = GAME_WIDTH + 50;
                    y = Math.random() * GAME_HEIGHT;
                    vx = -(Math.random() * 2 + 0.5);
                    vy = (Math.random() - 0.5) * 2;
                    break;
                case 2: // Bottom
                    x = Math.random() * GAME_WIDTH;
                    y = GAME_HEIGHT + 50;
                    vx = (Math.random() - 0.5) * 2;
                    vy = -(Math.random() * 2 + 0.5);
                    break;
                default: // Left
                    x = -50;
                    y = Math.random() * GAME_HEIGHT;
                    vx = Math.random() * 2 + 0.5;
                    vy = (Math.random() - 0.5) * 2;
                    break;
            }
            
            setAsteroids(prev => [...prev, createAsteroid(x, y, ASTEROID_SIZES[0], vx, vy)]);
        };

        const interval = setInterval(spawnAsteroid, 2000);
        // Spawn initial asteroids
        for (let i = 0; i < 3; i++) {
            setTimeout(spawnAsteroid, i * 500);
        }
        
        return () => clearInterval(interval);
    }, [isActive, gameStarted, createAsteroid]);

    if (!isActive) return null;

    return (
        <div className="relative">
            <div className="text-center mb-4">
                <div className="text-2xl font-bold text-purple-300 mb-2">Score: {score}</div>
                {!gameStarted && (
                    <div className="text-center">
                        <div className="text-lg text-purple-200 mb-2">Click anywhere to start!</div>
                        <div className="text-sm text-purple-300">WASD to move • Mouse to aim • Space/Click to shoot</div>
                    </div>
                )}
            </div>
            
            <div
                ref={gameAreaRef}
                className="relative bg-black/50 border-2 border-purple-500 rounded-lg overflow-hidden cursor-crosshair"
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                onMouseMove={handleMouseMove}
                onClick={shoot}
            >
                {/* Crosshair */}
                {gameStarted && (
                    <div
                        className="absolute w-4 h-4 pointer-events-none"
                        style={{
                            left: mousePos.x - 8,
                            top: mousePos.y - 8,
                            transform: 'translate(0, 0)'
                        }}
                    >
                        <div className="w-full h-0.5 bg-purple-400 absolute top-1/2 transform -translate-y-1/2"></div>
                        <div className="h-full w-0.5 bg-purple-400 absolute left-1/2 transform -translate-x-1/2"></div>
                    </div>
                )}

                {/* Player ship */}
                <div
                    className="absolute"
                    style={{
                        left: shipPos.x - 10,
                        top: shipPos.y - 10,
                        width: '20px',
                        height: '20px',
                        transform: `rotate(${Math.atan2(mousePos.y - shipPos.y, mousePos.x - shipPos.x) * 180 / Math.PI + 90}deg)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {/* Ship body (main triangle) */}
                    <div 
                        className="absolute w-4 h-4 bg-purple-400"
                        style={{
                            left: '2px',
                            top: '0px',
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            boxShadow: '0 0 4px #a855f7'
                        }}
                    />
                    {/* Ship thruster (small rectangle at back) */}
                    <div 
                        className="absolute w-2 h-1 bg-orange-400"
                        style={{
                            left: '7px',
                            top: '16px',
                            boxShadow: '0 0 6px #fb923c'
                        }}
                    />
                </div>

                {/* Bullets */}
                {bullets.map(bullet => (
                    <motion.div
                        key={bullet.id}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                            left: bullet.x - 1.5,
                            top: bullet.y - 1.5,
                            background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 70%, #d97706 100%)',
                            boxShadow: '0 0 8px #fbbf24, 0 0 16px #f59e0b'
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    />
                ))}

                {/* Asteroids */}
                {asteroids.map(asteroid => (
                    <motion.div
                        key={asteroid.id}
                        className="absolute border-2 border-gray-400 rounded-full bg-gray-600/30"
                        style={{
                            left: asteroid.x - asteroid.size,
                            top: asteroid.y - asteroid.size,
                            width: asteroid.size * 2,
                            height: asteroid.size * 2,
                            transform: `rotate(${asteroid.rotation}deg)`
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    />
                ))}

                {/* Particles */}
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        className="absolute w-1 h-1 bg-orange-400 rounded-full"
                        style={{
                            left: particle.x,
                            top: particle.y,
                            opacity: particle.life / particle.maxLife
                        }}
                    />
                ))}
            </div>
        </div>
    );
}