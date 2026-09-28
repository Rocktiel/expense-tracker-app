/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0A0E13',
        surface: '#131A22',
        surface2: '#1B2430',
        line: '#263241',
        ink: '#F3F6FA',
        muted: '#9AA8B9',
        faint: '#64748B',
        primary: '#34D399',
        onprimary: '#04281A',
        danger: '#F87171',
        warn: '#FBBF24',
        info: '#60A5FA',
      },
    },
  },
  plugins: [],
};
