import { motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

/**
 * PageTransition
 * Shared cinematic fade/scale wrapper applied to every top-level
 * route view so navigating between the Landing Page and the
 * Dashboard feels like a native, physically-animated app rather than
 * a hard page swap.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
