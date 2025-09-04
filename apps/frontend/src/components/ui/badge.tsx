import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-soft",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-soft",
        outline: "text-foreground border-border shadow-soft",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80 shadow-soft",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80 shadow-soft",
        error:
          "border-transparent bg-error text-error-foreground hover:bg-error/80 shadow-soft",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/80 shadow-soft",
        // New modern variants
        glass: "bg-white/10 backdrop-blur-md border-white/20 text-white shadow-glass",
        glassDark: "bg-black/20 backdrop-blur-md border-white/10 text-white shadow-glass-dark",
        gradient: "bg-gradient-to-r from-primary-500 to-primary-600 text-white border-transparent shadow-glow",
        subtle: "bg-muted text-muted-foreground border-muted-foreground/20",
        premium: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-transparent shadow-glow",
        beta: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-glow",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base",
        "2xl": "px-5 py-2 text-lg",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce-slow",
        shimmer: "bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer",
      },
      rounded: {
        default: "rounded-full",
        sm: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
      rounded: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  removable?: boolean
  onRemove?: () => void
  removeIcon?: React.ReactNode
}

function Badge({ 
  className, 
  variant, 
  size, 
  animation,
  rounded,
  icon, 
  iconPosition = 'left',
  removable = false,
  onRemove,
  removeIcon,
  children, 
  ...props 
}: BadgeProps) {
  const defaultRemoveIcon = (
    <svg
      className="ml-1 h-3 w-3 cursor-pointer hover:opacity-70 transition-opacity"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )

  return (
    <div 
      className={cn(badgeVariants({ variant, size, animation, rounded, className }))} 
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="mr-1 flex-shrink-0">{icon}</span>
      )}
      <span className="flex-shrink-0">{children}</span>
      {icon && iconPosition === 'right' && (
        <span className="ml-1 flex-shrink-0">{icon}</span>
      )}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 flex-shrink-0"
          aria-label="Remove badge"
        >
          {removeIcon || defaultRemoveIcon}
        </button>
      )}
    </div>
  )
}

export { Badge, badgeVariants }
