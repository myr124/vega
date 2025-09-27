"use client";

export default function Results() {
    return (
        <div className="min-h-screen p-8 relative z-[100] bg-transparent">
            {/* Video Title */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">
                    - VIDEO NAME - Audience Agent Simulation Results
                </h1>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                {/* Views Card */}
                <div className="glass p-6 rounded-lg border border-white/20 text-center">
                    <h3 className="text-white/80 text-sm mb-2">Views</h3>
                    <p className="text-white/60 text-xs mb-4">Average amount of people who clicked on your video from home or trending page</p>
                    <div className="text-4xl font-bold text-white mb-2">63%</div>
                    <p className="text-white/60 text-xs">6.3 / Agents agreed of a the views shown, making it probable that people will click on your video</p>
                </div>

                {/* Retention Card */}
                <div className="glass p-6 rounded-lg border border-white/20 text-center">
                    <h3 className="text-white/80 text-sm mb-2">Watch Time</h3>
                    <p className="text-white/60 text-xs mb-4">Average amount of time users would watch your video</p>
                    <div className="text-4xl font-bold text-white mb-2">58%</div>
                    <p className="text-white/60 text-xs">Average time when audience will click away from your video. 3 mins 20 secs of your video</p>
                </div>

                {/* Like/Dislike Card */}
                <div className="glass p-6 rounded-lg border border-white/20 text-center">
                    <h3 className="text-white/80 text-sm mb-2">Like/Dislike Ratio</h3>
                    <p className="text-white/60 text-xs mb-4">How much people like your content relative to dislikes</p>
                    <div className="flex justify-center mb-4">
                        <div className="w-24 h-24 rounded-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500" style={{clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%, 100% 70%)'}}></div>
                            <div className="absolute inset-0 bg-white/20" style={{clipPath: 'polygon(50% 50%, 100% 70%, 100% 100%, 0% 100%, 0% 0%)'}}></div>
                        </div>
                    </div>
                    <p className="text-white/60 text-xs">Great News! Audiences show a higher like count</p>
                </div>
            </div>

            {/* Agent Profiles Section */}
            <div className="max-w-6xl mx-auto">
                <h2 className="text-white text-lg text-center mb-8">
                    see what some of our agent profiles think about your video
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Bob Profile */}
                    <div className="glass p-6 rounded-lg border border-purple-500/30">
                        <h3 className="text-purple-400 text-xl font-semibold mb-4">Bob</h3>
                        <div className="space-y-2 text-white/80">
                            <p>Chance of click: <span className="text-white font-semibold">90%</span></p>
                            <p>Length of video watched: <span className="text-white font-semibold">100%</span></p>
                            <p className="text-white/60 italic">"comment"</p>
                        </div>
                    </div>

                    {/* Jane Profile */}
                    <div className="glass p-6 rounded-lg border border-purple-500/30">
                        <h3 className="text-purple-400 text-xl font-semibold mb-4">Jane - Professional Game Critic</h3>
                        <div className="space-y-2 text-white/80">
                            <p>Chance of viewing video once seen: <span className="text-white font-semibold">70%</span></p>
                            <p>Length of video watched: <span className="text-white font-semibold">90%</span></p>
                            <p>Conversion to subscriber rate: <span className="text-white font-semibold">20%</span></p>
                        </div>
                    </div>
                </div>

                {/* Additional Profiles Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Alex Profile */}
                    <div className="glass p-4 rounded-lg border border-white/10">
                        <h3 className="text-white/80 text-lg font-medium mb-2">Alex - Teenager interested in sports</h3>
                        <div className="text-white/60 text-sm">
                            <p>Profile analysis and metrics...</p>
                        </div>
                    </div>

                    {/* Juan Profile */}
                    <div className="glass p-4 rounded-lg border border-white/10">
                        <h3 className="text-white/80 text-lg font-medium mb-2">Juan - Parent watching with their child</h3>
                        <div className="text-white/60 text-sm">
                            <p>Profile analysis and metrics...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
