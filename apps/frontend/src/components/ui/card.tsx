import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'interactive' | 'glass' | 'glassDark' | 'gradient'
    hoverEffect?: 'none' | 'lift' | 'glow' | 'scale' | 'slide'
    animation?: 'none' | 'fadeIn' | 'slideUp' | 'scaleIn'
    delay?: number
  }
>(({ 
  className, 
  variant = 'default', 
  hoverEffect = 'none',
  animation = 'none',
  delay = 0,
  children, 
  ...props 
}, ref) => {
  const baseClasses = cn(
    "rounded-xl border bg-card text-card-foreground transition-all duration-300",
    className
  )

  const variantClasses = {
    default: "shadow-soft hover:shadow-medium",
    elevated: "shadow-medium hover:shadow-large",
    interactive: "shadow-soft hover:shadow-medium hover:scale-[1.02] cursor-pointer",
    glass: "bg-white/10 backdrop-blur-md border-white/20 shadow-glass hover:shadow-glass-dark",
    glassDark: "bg-black/20 backdrop-blur-md border-white/10 shadow-glass-dark hover:shadow-glass",
    gradient: "bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200 shadow-soft hover:shadow-medium",
  }

  const hoverClasses = {
    none: "",
    lift: "hover:-translate-y-1 hover:shadow-large",
    glow: "hover:shadow-glow",
    scale: "hover:scale-[1.02]",
    slide: "hover:translate-x-1 hover:shadow-large",
  }

  const animationConfigs = {
    none: { initial: undefined as any, animate: undefined as any, transition: undefined as any },
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.5, delay }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay }
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.3, delay }
    }
  }

  const cardClasses = cn(
    baseClasses,
    variantClasses[variant],
    hoverClasses[hoverEffect]
  )

  if (animation === 'none') {
    return (
      <div
        ref={ref}
        className={cardClasses}
        {...props}
      >
        {children}
      </div>
    )
  }

  const cfg = animationConfigs[animation]

  return (
    <motion.div
      ref={ref}
      className={cardClasses}
      initial={cfg.initial}
      animate={cfg.animate}
      transition={cfg.transition}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'compact' | 'spacious'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "flex flex-col space-y-1.5 p-6",
    compact: "flex flex-col space-y-1 p-4",
    spacious: "flex flex-col space-y-2 p-8",
  }

  return (
    <div
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    variant?: 'default' | 'large' | 'compact'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "text-lg font-semibold leading-none tracking-tight",
    large: "text-xl font-bold leading-none tracking-tight",
    compact: "text-base font-semibold leading-none tracking-tight",
  }

  return (
    <h3
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    variant?: 'default' | 'muted' | 'accent'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "text-sm text-muted-foreground",
    muted: "text-sm text-muted-foreground/80",
    accent: "text-sm text-primary/80",
  }

  return (
    <p
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'compact' | 'spacious'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "p-6 pt-0",
    compact: "p-4 pt-0",
    spacious: "p-8 pt-0",
  }

  return (
    <div 
      ref={ref} 
      className={cn(variantClasses[variant], className)} 
      {...props} 
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'compact' | 'spacious'
    alignment?: 'left' | 'center' | 'right' | 'between'
  }
>(({ className, variant = 'default', alignment = 'left', ...props }, ref) => {
  const variantClasses = {
    default: "p-6 pt-0",
    compact: "p-4 pt-0",
    spacious: "p-8 pt-0",
  }

  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        variantClasses[variant],
        alignmentClasses[alignment],
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
