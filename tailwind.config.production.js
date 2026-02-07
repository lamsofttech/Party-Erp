module.exports = {
  mode: 'jit',
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: '#1a202c',
        secondary: '#2d3748',
        accent: '#f6e05e',
        danger: '#e53e3e',
        success: '#48bb78',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      boxShadow: {
        custom: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        fade: 'fade 1s ease-in-out',
        bounce: 'bounce 2s infinite',
      },
      keyframes: {
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15%)' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#4a5568',
            a: {
              color: '#2b6cb0',
              '&:hover': {
                color: '#2c5282',
              },
            },
          },
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};