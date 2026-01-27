/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "class"],
  important: "#root",

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
  	extend: {
  		backgroundImage: {
  			'full-gradient': 'linear-gradient(180deg, rgba(32,183,153,0.5) 0.4%, #20B799 99.6%)',
  			'pending-gradient': 'linear-gradient(180deg, rgba(255,191,0,0.5) 0.4%, #FFBF00 99.6%)',
  			'pending-applicants-gradient': 'linear-gradient(180deg, rgba(131,85,0,0.5) 0.4%, #835500 99.6%)',
  			'withdrawal-gradient': 'linear-gradient(180deg, rgba(118,118,118,0.5) 0.4%, #767676 99.6%)',
  			'access-gradient': 'linear-gradient(180deg, rgba(18,10,245,0.5) 0.4%, #120AF5 99.6%)',
  			'unsigned-gradient': 'linear-gradient(180deg, rgba(131,0,0,0.5) 0.4%, #830000 99.6%)'
  		},
  		screens: {
  			'3xl': '1920px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },

  plugins: [
    require("tailwindcss-animate"),
  ],
};
