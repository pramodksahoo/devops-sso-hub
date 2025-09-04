import { fontFamily } from "tailwindcss/defaultTheme"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Enhanced Color Palette - Enterprise Grade
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Semantic foreground helpers for utilities like text-primary-foreground
        'primary-foreground': 'hsl(var(--primary-foreground))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        'success-foreground': 'hsl(var(--success-foreground))',
        'warning-foreground': 'hsl(var(--warning-foreground))',
        'error-foreground': 'hsl(var(--error-foreground))',
        'info-foreground': 'hsl(var(--info-foreground))',
        
        // Primary Colors - Professional Blue Scale
        primary: {
          50: "hsl(210, 100%, 98%)",
          100: "hsl(210, 100%, 96%)",
          200: "hsl(214, 95%, 93%)",
          300: "hsl(213, 97%, 87%)",
          400: "hsl(215, 91%, 78%)",
          500: "hsl(217, 91%, 60%)",
          600: "hsl(221, 83%, 53%)",
          700: "hsl(224, 76%, 48%)",
          800: "hsl(226, 71%, 40%)",
          900: "hsl(224, 64%, 33%)",
          950: "hsl(229, 84%, 5%)",
          DEFAULT: "hsl(217, 91%, 60%)",
        },
        
        // Secondary Colors - Sophisticated Gray Scale
        secondary: {
          50: "hsl(210, 20%, 98%)",
          100: "hsl(220, 14%, 96%)",
          200: "hsl(220, 13%, 91%)",
          300: "hsl(216, 12%, 84%)",
          400: "hsl(218, 11%, 65%)",
          500: "hsl(220, 9%, 46%)",
          600: "hsl(215, 14%, 34%)",
          700: "hsl(217, 19%, 27%)",
          800: "hsl(215, 28%, 17%)",
          900: "hsl(221, 39%, 11%)",
          950: "hsl(229, 84%, 5%)",
          DEFAULT: "hsl(220, 9%, 46%)",
        },
        
        // Success Colors - Professional Green Scale
        success: {
          50: "hsl(138, 76%, 97%)",
          100: "hsl(141, 84%, 93%)",
          200: "hsl(141, 79%, 85%)",
          300: "hsl(142, 77%, 73%)",
          400: "hsl(142, 69%, 58%)",
          500: "hsl(142, 71%, 45%)",
          600: "hsl(142, 76%, 36%)",
          700: "hsl(142, 72%, 29%)",
          800: "hsl(144, 70%, 25%)",
          900: "hsl(145, 80%, 20%)",
          950: "hsl(144, 83%, 10%)",
          DEFAULT: "hsl(142, 71%, 45%)",
        },
        
        // Warning Colors - Professional Yellow Scale
        warning: {
          50: "hsl(48, 96%, 89%)",
          100: "hsl(48, 96%, 78%)",
          200: "hsl(48, 97%, 66%)",
          300: "hsl(48, 96%, 53%)",
          400: "hsl(48, 96%, 40%)",
          500: "hsl(48, 96%, 27%)",
          600: "hsl(48, 96%, 20%)",
          700: "hsl(48, 96%, 16%)",
          800: "hsl(48, 96%, 13%)",
          900: "hsl(48, 96%, 10%)",
          950: "hsl(48, 96%, 5%)",
          DEFAULT: "hsl(48, 96%, 27%)",
        },
        
        // Error Colors - Professional Red Scale
        error: {
          50: "hsl(0, 85%, 97%)",
          100: "hsl(0, 93%, 94%)",
          200: "hsl(0, 96%, 89%)",
          300: "hsl(0, 94%, 82%)",
          400: "hsl(0, 91%, 71%)",
          500: "hsl(0, 84%, 60%)",
          600: "hsl(0, 72%, 51%)",
          700: "hsl(0, 74%, 42%)",
          800: "hsl(0, 70%, 35%)",
          900: "hsl(0, 63%, 31%)",
          950: "hsl(0, 85%, 15%)",
          DEFAULT: "hsl(0, 84%, 60%)",
        },
        
        // Info Colors - Professional Blue Scale
        info: {
          50: "hsl(199, 89%, 96%)",
          100: "hsl(199, 88%, 90%)",
          200: "hsl(199, 88%, 80%)",
          300: "hsl(199, 88%, 67%)",
          400: "hsl(199, 88%, 52%)",
          500: "hsl(199, 88%, 37%)",
          600: "hsl(199, 88%, 30%)",
          700: "hsl(199, 88%, 25%)",
          800: "hsl(199, 88%, 21%)",
          900: "hsl(199, 88%, 18%)",
          950: "hsl(199, 88%, 9%)",
          DEFAULT: "hsl(199, 88%, 37%)",
        },
        
        // Neutral Colors - Professional Gray Scale
        neutral: {
          50: "hsl(0, 0%, 98%)",
          100: "hsl(0, 0%, 96%)",
          200: "hsl(0, 0%, 90%)",
          300: "hsl(0, 0%, 83%)",
          400: "hsl(0, 0%, 64%)",
          500: "hsl(0, 0%, 45%)",
          600: "hsl(0, 0%, 32%)",
          700: "hsl(0, 0%, 25%)",
          800: "hsl(0, 0%, 15%)",
          900: "hsl(0, 0%, 9%)",
          950: "hsl(0, 0%, 4%)",
          DEFAULT: "hsl(0, 0%, 45%)",
        },
        
        // Card & Surface Colors
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      
      // Enhanced Border Radius System
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 2px)",
        "2xl": "calc(var(--radius) + 4px)",
        "3xl": "calc(var(--radius) + 8px)",
        "4xl": "calc(var(--radius) + 12px)",
        "5xl": "calc(var(--radius) + 16px)",
      },
      
      // Enhanced Spacing System
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        '176': '44rem',
        '192': '48rem',
        '208': '52rem',
        '224': '56rem',
        '240': '60rem',
      },
      
      // Enhanced Typography System
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif", ...fontFamily.sans],
        mono: ["JetBrains Mono", "monospace", ...fontFamily.mono],
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.025em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '0.025em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '0.025em' }],
      },
      
      // Enhanced Shadow System
      boxShadow: {
        'soft': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'medium': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'large': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'glow': '0 0 20px rgb(59 130 246 / 0.5)',
        'glow-lg': '0 0 40px rgb(59 130 246 / 0.3)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'glass': '0 8px 32px 0 rgb(31 38 135 / 0.37)',
        'glass-dark': '0 8px 32px 0 rgb(0 0 0 / 0.37)',
      },
      
      // Enhanced Animation System
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      
      // Enhanced Keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      
      // Enhanced Backdrop Blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      
      // Enhanced Z-Index System
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Enhanced Grid System
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      
      // Enhanced Flexbox Utilities
      flex: {
        '2': '2 2 0%',
        '3': '3 3 0%',
        '4': '4 4 0%',
        '5': '5 5 0%',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
}
