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
                primary: {
                    DEFAULT: "#00f2ff",
                    dark: "#00c8d4",
                },
                secondary: {
                    DEFAULT: "#7000ff",
                    dark: "#5b00cc",
                },
                accent: "#ff00e5",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "neon-gradient": "linear-gradient(to right, #00f2ff, #7000ff)",
            },
            boxShadow: {
                "neon-cyan": "0 0 10px rgba(0, 242, 255, 0.5), 0 0 20px rgba(0, 242, 255, 0.3)",
                "neon-purple": "0 0 10px rgba(112, 0, 255, 0.5), 0 0 20px rgba(112, 0, 255, 0.3)",
            },
        },
    },
    plugins: [],
};
export default config;
