module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f9ff',
          100: '#e6f0ff',
          200: '#c5dcff',
          300: '#9dc2ff',
          400: '#6fa2ff',
          500: '#3d7dff',
          600: '#1f5fe6',
          700: '#1649b4',
          800: '#123c91',
          900: '#102f72'
        }
      }
    }
  },
  plugins: []
};
