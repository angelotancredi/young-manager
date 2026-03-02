import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // 💡 프리텐다드를 기본 샌스 폰트로 지정
                sans: ["Pretendard", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
