import { PressLink } from "@/components/motion/PressLink";
import { Reveal } from "@/components/motion/Reveal";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <Reveal className="flex flex-col gap-4">
        <h1 className="text-display text-4xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Save what sparks you. Follow what stays with you.
        </h1>
        <p className="text-body max-w-xl text-base text-zinc-600 dark:text-zinc-400">
          Spark is a calm home for the things that make you
          curious, and a guided way to do something with them. Save freely.
          Pursue one.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="flex flex-col gap-3 sm:flex-row">
        <PressLink href="/mindmap" variant="primary">
          Open your mindmaps
        </PressLink>
        <PressLink href="/library" variant="secondary">
          Browse the Spark Library
        </PressLink>
      </Reveal>
    </main>
  );
}
