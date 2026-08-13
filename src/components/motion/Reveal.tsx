"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const components = {
  div: motion.div,
  li: motion.li,
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof typeof components;
}) {
  const Component = components[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.5, delay }}
    >
      {children}
    </Component>
  );
}
