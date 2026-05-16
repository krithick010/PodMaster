/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-base": "var(--bg-base)",
        "bg-surface": "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-border": "var(--bg-border)",
        "accent-cyan": "var(--accent-cyan)",
        "accent-violet": "var(--accent-violet)",
        "accent-emerald": "var(--accent-emerald)",
        "accent-amber": "var(--accent-amber)",
        "accent-red": "var(--accent-red)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
        body: 'var(--font-body)',
      },
      boxShadow: {
        'glow-cyan': 'var(--glow-cyan)',
        'glow-red': 'var(--glow-red)',
        'glow-emerald': 'var(--glow-emerald)',
      },
    },
  },
  plugins: [],
};
