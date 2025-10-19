/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}"
  ],
  theme: {
    // Chỉ có MỘT khối extend ở đây
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        grotesk: ['var(--font-space-grotesk)', 'sans-serif'] 
      },
      colors: {
        brand: {
          50:  "#eef6ff",
          100: "#e2efff",
          200: "#cfe5ff",
          300: "#a9d1ff",
          400: "#79b6ff",
          500: "#4d98ff",
          600: "#2d79f6",
          700: "#255fca",
          800: "#214fa6",
          900: "#1f4280"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(37,95,202,0.10)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'), 
    require('tailwind-scrollbar')({ nocompatible: true }), 
  ],
}
  