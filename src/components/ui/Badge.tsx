import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary border border-primary/20',
        error: 'bg-danger/15 text-danger border border-danger/20',
        warning: 'bg-warning/15 text-warning border border-warning/20',
        success: 'bg-success/15 text-success border border-success/20',
        muted: 'bg-muted/15 text-muted border border-muted/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({
  className,
  variant,
  children,
}: {
  className?: string
  variant?: VariantProps<typeof badgeVariants>['variant']
  children: React.ReactNode
}) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
}
