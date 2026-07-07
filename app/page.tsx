import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:px-12">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Before you spend, get a Verdict.
        </h1>
        <p className="max-w-xl text-lg text-foreground/70 text-balance sm:text-xl">
          AI-powered reviews for static Meta ad creatives before you launch.
        </p>
        <Link
          href="/analyze"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Analyze a Creative
        </Link>
      </div>
    </main>
  );
}
