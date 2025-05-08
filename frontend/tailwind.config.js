// tailwind.config.js
module.exports = {
  darkMode: 'class',            // ← 关键：使用 .dark 类来切换
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/@suiet/wallet-kit/**/*.{js,ts,jsx,tsx,css}"
  ],
  theme: { extend: {} },
  plugins: [],
}

