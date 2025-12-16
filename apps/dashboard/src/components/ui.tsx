import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  variant?: 'default' | 'danger' | 'success'
}

export function Card({ children, className, glow, variant = 'default' }: CardProps) {
  return (
    <div
      className={clsx(
        'glass-panel p-6 transition-all duration-300',
        glow && 'card-glow',
        variant === 'danger' && 'glass-panel-danger',
        variant === 'success' && 'border-neon-green/20',
        className
      )}
    >
      {children}
    </div>
  )
}

interface BadgeProps {
  variant: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info'
  children: React.ReactNode
  className?: string
  pulse?: boolean
}

const badgeStyles = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/40',
  success: 'bg-neon-green/10 text-neon-green border-neon-green/40 shadow-[0_0_10px_rgba(57,255,20,0.3)]',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  info: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/40 shadow-[0_0_10px_rgba(0,242,234,0.2)]',
}

export function Badge({ variant, children, className, pulse }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium font-mono uppercase tracking-wider border backdrop-blur-sm',
        badgeStyles[variant],
        pulse && 'animate-pulse',
        className
      )}
    >
      {(variant === 'critical' || variant === 'high') && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  glow = true,
  className, 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 uppercase tracking-wide overflow-hidden',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
        // Primary - Neon Cyan Holographic
        variant === 'primary' && [
          'bg-gradient-to-r from-neon-cyan/20 to-neon-cyan/10',
          'border border-neon-cyan/50',
          'text-neon-cyan',
          'hover:from-neon-cyan/30 hover:to-neon-cyan/20',
          'hover:border-neon-cyan hover:shadow-neon-cyan',
          'hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-none',
          glow && 'shadow-[0_0_15px_rgba(0,242,234,0.3)]',
        ],
        // Secondary - Glass Style
        variant === 'secondary' && [
          'bg-white/5 backdrop-blur-sm',
          'border border-white/10',
          'text-gray-300',
          'hover:bg-white/10 hover:border-white/20',
          'hover:text-white hover:-translate-y-0.5',
          'active:translate-y-0',
        ],
        // Danger - Neon Pink
        variant === 'danger' && [
          'bg-gradient-to-r from-neon-pink/20 to-neon-pink/10',
          'border border-neon-pink/50',
          'text-neon-pink',
          'hover:from-neon-pink/30 hover:to-neon-pink/20',
          'hover:border-neon-pink hover:shadow-neon-pink',
          'hover:-translate-y-0.5',
          'active:translate-y-0',
          glow && 'shadow-[0_0_15px_rgba(255,0,85,0.3)]',
        ],
        // Ghost - Minimal
        variant === 'ghost' && [
          'bg-transparent border-transparent',
          'text-gray-400 hover:text-neon-cyan',
          'hover:bg-neon-cyan/5',
        ],
        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-xs gap-1.5',
        size === 'md' && 'px-4 py-2 text-sm gap-2',
        size === 'lg' && 'px-6 py-3 text-base gap-2',
        className
      )}
      {...props}
    >
      {/* Shimmer effect on hover */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

export function Input({ label, icon, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          className={clsx(
            'w-full px-4 py-3 bg-soc-dark/80 backdrop-blur-sm border border-soc-border rounded-lg',
            'text-white placeholder-gray-600 font-mono text-sm',
            'focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20',
            'focus:shadow-[0_0_20px_rgba(0,242,234,0.1)]',
            'transition-all duration-300',
            'hover:border-neon-cyan/30',
            icon && 'pl-11',
            className
          )}
          {...props}
        />
        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent transition-all duration-300 group-focus-within:w-full" />
      </div>
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full px-4 py-3 bg-soc-dark/80 backdrop-blur-sm border border-soc-border rounded-lg',
          'text-white font-mono text-sm',
          'focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20',
          'focus:shadow-[0_0_20px_rgba(0,242,234,0.1)]',
          'transition-all duration-300',
          'hover:border-neon-cyan/30',
          'cursor-pointer appearance-none',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2300f2ea\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-soc-dark">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// New Component: Stat Card for Dashboard
interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'cyan' | 'pink' | 'green' | 'orange'
  className?: string
}

export function StatCard({ icon, value, label, variant = 'cyan', className }: StatCardProps) {
  const colors = {
    cyan: {
      icon: 'text-neon-cyan',
      glow: 'from-neon-cyan/20 to-transparent',
      border: 'hover:border-neon-cyan/30',
    },
    pink: {
      icon: 'text-neon-pink',
      glow: 'from-neon-pink/20 to-transparent',
      border: 'hover:border-neon-pink/30',
    },
    green: {
      icon: 'text-neon-green',
      glow: 'from-neon-green/20 to-transparent',
      border: 'hover:border-neon-green/30',
    },
    orange: {
      icon: 'text-neon-orange',
      glow: 'from-neon-orange/20 to-transparent',
      border: 'hover:border-neon-orange/30',
    },
  }

  return (
    <div
      className={clsx(
        'glass-panel p-5 transition-all duration-300 group cursor-default',
        'hover:-translate-y-1',
        colors[variant].border,
        className
      )}
    >
      {/* Background glow */}
      <div className={clsx(
        'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2',
        `bg-gradient-radial ${colors[variant].glow}`
      )} />
      
      {/* Icon */}
      <div className={clsx('relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', 
        'bg-gradient-to-br from-white/5 to-transparent border border-white/10',
        colors[variant].icon
      )}>
        {icon}
      </div>
      
      {/* Value */}
      <p className={clsx(
        'relative text-3xl font-bold font-display tracking-wide mb-1',
        colors[variant].icon
      )}>
        {value}
      </p>
      
      {/* Label */}
      <p className="relative text-sm text-gray-400 font-medium">{label}</p>
    </div>
  )
}

// Hexagonal Icon Container
interface HexIconProps {
  children: React.ReactNode
  variant?: 'cyan' | 'pink' | 'green' | 'orange'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HexIcon({ children, variant = 'cyan', size = 'md', className }: HexIconProps) {
  const colors = {
    cyan: 'from-neon-cyan/30 to-neon-cyan/10 border-neon-cyan/40 text-neon-cyan shadow-[0_0_15px_rgba(0,242,234,0.3)]',
    pink: 'from-neon-pink/30 to-neon-pink/10 border-neon-pink/40 text-neon-pink shadow-[0_0_15px_rgba(255,0,85,0.3)]',
    green: 'from-neon-green/30 to-neon-green/10 border-neon-green/40 text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.3)]',
    orange: 'from-neon-orange/30 to-neon-orange/10 border-neon-orange/40 text-neon-orange shadow-[0_0_15px_rgba(255,102,0,0.3)]',
  }
  
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div 
      className={clsx(
        'clip-hexagon flex items-center justify-center bg-gradient-to-br border',
        colors[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </div>
  )
}

// Progress Ring Component
interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  variant?: 'cyan' | 'pink' | 'green'
  children?: React.ReactNode
}

export function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 4, 
  variant = 'cyan',
  children 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const colors = {
    cyan: { stroke: '#00f2ea', glow: 'drop-shadow-[0_0_8px_rgba(0,242,234,0.8)]' },
    pink: { stroke: '#ff0055', glow: 'drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]' },
    green: { stroke: '#39ff14', glow: 'drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]' },
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className={clsx('-rotate-90', colors[variant].glow)}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[variant].stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
