import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Plan = {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    ctaHref: string;
    highlighted?: boolean;
};

const plans: Plan[] = [
    {
        name: "Starter",
        price: "$0",
        period: "/mo",
        description: "Try Vega with prompt-only analysis.",
        features: [
            "Prompt-only insights",
            "Up to 3 analyses/day",
            "Basic agent personas",
        ],
        ctaHref: "/signup",
    },
    {
        name: "Creator",
        price: "$19",
        period: "/mo",
        description: "Upload videos and get full multi-agent insights.",
        features: [
            "Video uploads (up to 250MB/video)",
            "Unlimited analyses",
            "Full agent persona set",
            "Engagement & retention metrics",
            "Export results (CSV/JSON)",
        ],
        ctaHref: "/signup",
        highlighted: true,
    },
    {
        name: "Studio",
        price: "$49",
        period: "/mo",
        description: "For teams and power users who need scale.",
        features: [
            "Bigger uploads (up to 1GB/video)",
            "Priority processing",
            "Team seats (up to 5)",
            "Advanced segmentation",
            "Priority support",
        ],
        ctaHref: "/signup",
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-indigo-900 to-gray-900 text-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight">Pricing</h1>
                    <p className="text-white/70 mt-2">
                        Choose the plan that fits your content workflow. Upgrade anytime.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`bg-black/60 border-white/20 ${plan.highlighted ? "border-purple-400/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]" : ""
                                }`}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-baseline gap-2">
                                    <span className="text-2xl">{plan.name}</span>
                                    <span className="ml-auto text-3xl font-bold">
                                        {plan.price}
                                        <span className="text-lg font-normal text-white/70">{plan.period}</span>
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-white/70">
                                    {plan.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-white/80">
                                            <Check className="w-4 h-4 text-green-400 mt-1" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button asChild className={plan.highlighted ? "bg-purple-500 hover:bg-purple-400" : undefined}>
                                    <Link href={plan.ctaHref}>Get Started</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <p className="text-center text-white/60 text-sm mt-8">
                    Need a custom plan?{" "}
                    <a className="underline hover:text-white" href="mailto:sales@example.com">Contact sales</a>.
                </p>
            </div>
        </div>
    );
}
