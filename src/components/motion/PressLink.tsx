"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const base =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-[0.9375rem] font-medium tracking-[-0.01em]";

const variants = {
  primary:
    "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900",
  secondary:
    "border border-black/[.08] text-zinc-800 dark:border-white/[.145] dark:text-zinc-200",
};

export function PressLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
    >
      <Link href={href} className={`${base} ${variants[variant]}`}>
        {children}
      </Link>
    </motion.div>
  );
}
