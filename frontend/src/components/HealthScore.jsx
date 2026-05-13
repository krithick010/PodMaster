import React from "react";
import { motion } from "framer-motion";

export function HealthScore({ score = 100, grade = "A", critical = 0, warning = 0 }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const gradeColor = {
    A: "text-accent-emerald",
    B: "text-accent-cyan",
    C: "text-accent-amber",
    D: "text-accent-amber",
    F: "text-accent-red",
  }[grade] || "text-text-secondary";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="flex flex-col items-center justify-center p-6 bg-elevated rounded-lg border-subtle"
    >
      <h3 className="text-xs font-mono font-600 text-text-secondary mb-4 uppercase">
        Cluster Health
      </h3>

      <div className="relative w-32 h-32 mb-4">
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--bg-border)"
            strokeWidth="2"
            opacity="0.5"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={
              grade === "A"
                ? "var(--accent-emerald)"
                : grade === "B"
                  ? "var(--accent-cyan)"
                  : grade === "C"
                    ? "var(--accent-amber)"
                    : "var(--accent-red)"
            }
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`font-display font-700 text-4xl ${gradeColor}`}
          >
            {grade}
          </motion.div>
          <div className="text-xs font-mono text-text-muted">{score}%</div>
        </div>
      </div>

      <div className="space-y-1 text-center">
        {critical > 0 && (
          <div className="text-xs font-mono">
            <span className="text-accent-red">{critical}</span>{" "}
            <span className="text-text-muted">critical</span>
          </div>
        )}
        {warning > 0 && (
          <div className="text-xs font-mono">
            <span className="text-accent-amber">{warning}</span>{" "}
            <span className="text-text-muted">warning</span>
          </div>
        )}
        {critical === 0 && warning === 0 && (
          <div className="text-xs font-mono text-accent-emerald">✓ All clear</div>
        )}
      </div>
    </motion.div>
  );
}
