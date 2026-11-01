/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blood: {
          50: '#fdf2f3',
          100: '#fce7e9',
          200: '#f9d2d6',
          300: '#f4adb5',
          400: '#eb7b88',
          500: '#de4b5d',
          600: '#c8283e',
          700: '#B91C32', // Brand primary red
          800: '#8b1527',
          900: '#741724',
          950: '#400710',
        },
        charcoal: {
          50: '#f6f6f7',
          100: '#e1e3e5',
          200: '#c3c7cb',
          300: '#9fa6ad',
          400: '#7a838d',
          500: '#606a75',
          600: '#4b535d',
          700: '#3c424a',
          800: '#2b3036',
          900: '#1e2227', // Dark charcoal typography
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
