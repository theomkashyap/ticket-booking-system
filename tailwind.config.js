/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',   // warm off-white
        charcoal:   '#1A1A1A',   // primary text/headers
        accent:     '#C8102E',   // cinema red — buttons & active states ONLY
        available:  '#8FA88A',   // muted sage green
        held:       '#D4A017',   // muted amber
        booked:     '#B0B0B0',   // flat gray
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],        // headings/titles
        sans:  ['system-ui', '-apple-system', 'sans-serif'],  // body/labels/buttons
      },
      borderRadius: {
        DEFAULT: '5px',   // max 4-6px everywhere, never the default 16-24px
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        }
      },
      animation: {
        breathe: 'breathe 0.7s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}