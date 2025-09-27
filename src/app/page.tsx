import Image from "next/image";
import { Button } from "@/components/ui/button";


export default function Home() {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="text-3xl text-center font-bold">Vega Base</div>
            <Button variant={"outline"}>This is a button!</Button>
        </div>
    );
}
