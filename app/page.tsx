import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Phone, Zap, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-semibold">Scout</span>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Dashboard
          </Link>
          <Link href="/dashboard/scout" className={cn(buttonVariants())}>
            Start Scouting
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Stop guessing.
            <br />
            <span className="text-muted-foreground">Start scouting.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Scout calls restaurants right now so you don&apos;t walk into a bad
            night. Get real-time wait times, vibe checks, and menu intel —
            all in under 3 minutes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/dashboard/scout"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start Scouting
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-3xl gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Parallel Calls</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Scout calls 3-5 restaurants at once with a natural, human-like
              voice agent.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Under 3 Minutes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Real-time results stream in as each call completes. No more
              guessing.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Smart Comparison</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-ranked results with wait times, vibe reports, and menu
              availability.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-2xl">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-8 space-y-6">
            {[
              {
                step: "1",
                title: "Tell us what you want",
                desc: 'Neighborhood, party size, time, and vibe — like "Hayes Valley, 2 people, tonight around 8, somewhere chill"',
              },
              {
                step: "2",
                title: "Pick your restaurants",
                desc: "We search Google Places and show you options. Pick up to 5, or let us auto-select the top-rated ones.",
              },
              {
                step: "3",
                title: "Scout calls them all",
                desc: "Our AI agent calls each restaurant in parallel. Watch live transcripts as conversations happen.",
              },
              {
                step: "4",
                title: "Compare and book",
                desc: "Get a ranked comparison with wait times, vibe checks, and menu intel. Book your pick with one click.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Built with Vapi, Google Places, and a love for good food.
      </footer>
    </div>
  );
}
