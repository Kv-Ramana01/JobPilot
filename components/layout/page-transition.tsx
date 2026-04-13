// components/layout/page-transition.tsx
"use client";

import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  className?: string;
}

const variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function PageTransition({ children, className }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list items
export const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
