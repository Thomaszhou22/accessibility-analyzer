import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-foreground hover:bg-primary/90 shadow-sm',
        outline: 'border border-border bg-transparent hover:bg-surface hover:text-foreground',
        ghost: 'hover:bg-surface hover:text-foreground',
        destructive: 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30',
        success: 'bg-success/10 text-success hover:bg-success/20 border border-success/30',
      },
      size: {
        default: 'h-9 px-4 gap-2',
        sm: 'h-8 px-3 gap-1.5 text-xs',
        lg: 'h-11 px-6 gap-2 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)
Button.displayName = 'Button'
