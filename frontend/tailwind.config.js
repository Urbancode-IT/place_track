/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
        syne: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['"Outfit"', 'system-ui', 'sans-serif'],
        outfit: ['"Outfit"', 'system-ui', 'sans-serif'],
        arial: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
