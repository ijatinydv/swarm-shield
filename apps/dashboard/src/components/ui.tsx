import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-soc-card border border-soc-border rounded-xl p-5',
        glow && 'card-glow',
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
}

const badgeStyles = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        badgeStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-neon-cyan text-soc-dark hover:bg-neon-cyan/90': variant === 'primary',
          'bg-soc-card border border-soc-border text-white hover:bg-white/5': variant === 'secondary',
          'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-400">{label}</label>
      )}
      <input
        className={clsx(
          'w-full px-4 py-2.5 bg-soc-dark border border-soc-border rounded-lg',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20',
          'transition-all',
          className
        )}
        {...props}
      />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-400">{label}</label>
      )}
      <select
        className={clsx(
          'w-full px-4 py-2.5 bg-soc-dark border border-soc-border rounded-lg',
          'text-white',
          'focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20',
          'transition-all',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
