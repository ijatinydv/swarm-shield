/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        display: ['Orbitron', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary Neon Accents
        'neon-cyan': '#00f2ea',
        'neon-pink': '#ff0055',
        'soc-bg': '#030508',
        'neon-green': '#39ff14',
        'neon-orange': '#ff6600',
        'neon-purple': '#bf00ff',
        'neon-blue': '#00d4ff',
        // Deep Space Theme
        'soc-dark': '#0a0e17',
        'soc-darker': '#050810',
        'soc-darkest': '#020408',
        'soc-card': 'rgba(10, 14, 23, 0.6)',
        'soc-border': 'rgba(0, 242, 234, 0.15)',
        // Glass colors
        'glass-white': 'rgba(255, 255, 255, 0.05)',
        'glass-cyan': 'rgba(0, 242, 234, 0.08)',
        'glass-pink': 'rgba(255, 0, 85, 0.08)',
      },
      animation: {
        'pulse': 'pulse 2.5s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2.4s ease-in-out infinite alternate',
        'glow-pink': 'glow-pink 2.4s ease-in-out infinite alternate',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'typing': 'typing 2s steps(20) infinite',
        'border-flow': 'border-flow 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { 
            boxShadow: '0 0 5px rgba(0, 242, 234, 0.4), 0 0 10px rgba(0, 242, 234, 0.2), inset 0 0 5px rgba(0, 242, 234, 0.1)',
            borderColor: 'rgba(0, 242, 234, 0.4)'
          },
          '100%': { 
            boxShadow: '0 0 10px rgba(0, 242, 234, 0.6), 0 0 20px rgba(0, 242, 234, 0.4), 0 0 30px rgba(0, 242, 234, 0.2), inset 0 0 10px rgba(0, 242, 234, 0.15)',
            borderColor: 'rgba(0, 242, 234, 0.6)'
          },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.7' },
        },
        'glow-pink': {
          '0%': { 
            boxShadow: '0 0 5px rgba(255, 0, 85, 0.4), 0 0 10px rgba(255, 0, 85, 0.2)',
            borderColor: 'rgba(255, 0, 85, 0.4)'
          },
          '100%': { 
            boxShadow: '0 0 10px rgba(255, 0, 85, 0.6), 0 0 20px rgba(255, 0, 85, 0.4), 0 0 30px rgba(255, 0, 85, 0.2)',
            borderColor: 'rgba(255, 0, 85, 0.6)'
          },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.1)', opacity: '0.4' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'typing': {
          '0%': { width: '0' },
          '50%': { width: '100%' },
          '100%': { width: '0' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'neon-gradient': 'linear-gradient(135deg, #00f2ea 0%, #ff0055 50%, #bf00ff 100%)',
        'cyber-grid': 'linear-gradient(rgba(0, 242, 234, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 234, 0.03) 1px, transparent 1px)',
        'deep-space': 'radial-gradient(ellipse at bottom, #1B2838 0%, #050810 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
      },
      backgroundSize: {
        'grid-size': '50px 50px',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'neon-cyan': '0 0 5px rgba(0, 242, 234, 0.5), 0 0 10px rgba(0, 242, 234, 0.3), 0 0 15px rgba(0, 242, 234, 0.2)',
        'neon-pink': '0 0 5px rgba(255, 0, 85, 0.5), 0 0 10px rgba(255, 0, 85, 0.3), 0 0 15px rgba(255, 0, 85, 0.2)',
        'neon-green': '0 0 5px rgba(57, 255, 20, 0.5), 0 0 10px rgba(57, 255, 20, 0.3), 0 0 15px rgba(57, 255, 20, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'inner-glow': 'inset 0 0 20px rgba(0, 242, 234, 0.1)',
      },
      dropShadow: {
        'neon-cyan': '0 0 10px rgba(0, 242, 234, 0.8)',
        'neon-pink': '0 0 10px rgba(255, 0, 85, 0.8)',
        'neon-green': '0 0 10px rgba(57, 255, 20, 0.8)',
      }
    },
  },
  plugins: [],
}
