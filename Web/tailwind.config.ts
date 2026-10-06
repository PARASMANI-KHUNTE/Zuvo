import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                surface: {
                    DEFAULT: "#111113",
                    subtle: "#18181b",
                    elevated: "#1f1f23",
                },
                primary: {
                    DEFAULT: "#ffffff",
                    dark: "#e4e4e7",
                    foreground: "#09090b",
                },
                secondary: {
                    DEFAULT: "#a1a1aa",
                    dark: "#71717a",
                },
                accent: {
                    DEFAULT: "#e4e4e7",
                    highlight: "#ffffff",
                },
                border: "rgba(255, 255, 255, 0.08)",
            },
            boxShadow: {
                "subtle": "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
                "card": "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
                "elevation": "0 10px 30px -5px rgba(0, 0, 0, 0.7)",
            },
        },
    },
    plugins: [],
};
export default config;
