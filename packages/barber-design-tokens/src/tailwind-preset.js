/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "#f8f7f4",
        foreground: "#1c1917",
        card: { DEFAULT: "#ffffff", foreground: "#1c1917" },
        muted: { DEFAULT: "#efeeeb", foreground: "#78716c" },
        primary: { DEFAULT: "#1c1917", foreground: "#fafaf9" },
        secondary: { DEFAULT: "#ebe8e3", foreground: "#1c1917" },
        accent: { DEFAULT: "#ebe8e3", foreground: "#1c1917" },
        destructive: { DEFAULT: "#dc2626", foreground: "#fafaf9" },
        border: "#e4e0d8",
        input: "#e4e0d8",
        ring: "#1c1917",
        sidebar: {
          DEFAULT: "#f5f4f1",
          foreground: "#57534e",
          primary: "#1c1917",
          "primary-foreground": "#fafaf9",
          accent: "#ebe8e3",
          "accent-foreground": "#1c1917",
          border: "#e0ddd6",
        },
      },
      borderRadius: { lg: "12px", md: "10px", sm: "8px" },
      fontFamily: {
        heading: ["Outfit", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(41, 38, 36, 0.04), 0 1px 3px 0 rgba(41, 38, 36, 0.03)",
        matte: "0 4px 24px -4px rgba(41, 38, 36, 0.04)",
      },
    },
  },
};
