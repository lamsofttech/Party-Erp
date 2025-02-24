/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      backgroundImage: {
        "full-gradient": "linear-gradient(180deg,rgba(32,183,153,0.5) 0.4%, #20B799 99.6%)",
        "pending-gradient": "linear-gradient(180deg, rgba(255, 191, 0, 0.50) 0.4%, #FFBF00 99.6%)",
        "pending-applicants-gradient": "linear-gradient(180deg, rgba(131, 85, 0, 0.50) 0.4%, #835500 99.6%)",
        "withdrawal-gradient": "linear-gradient(180deg, rgba(118, 118, 118, 0.50) 0.4%, #767676 99.6%)",
        "access-gradient": "linear-gradient(180deg, rgba(18, 10, 245, 0.50) 0.4%, #120AF5 99.6%)",
        "unsigned-gradient": "linear-gradient(180deg, rgba(131, 0, 0, 0.50) 0.4%, #830000 99.6%)",
      },
      screens: {
        "3xl": "1920px",
      },
    },
  },
  plugins: [],
};

