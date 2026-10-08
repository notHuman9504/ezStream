import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal transition-[background-color,border-color,color,opacity,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-fg text-background hover:bg-fg/90",
        secondary: "border border-fg/20 bg-muted text-fg hover:border-fg/40",
        ghost: "text-fg hover:bg-fg/10",
        accent: "bg-brand text-background hover:bg-brand/90",
        danger: "border border-danger/30 bg-danger/15 text-danger hover:bg-danger/25",
      },
      size: {
        sm: "h-9 px-4 text-[0.8125rem] tracking-[-0.02em]",
        md: "h-10 px-5 text-btn",
        lg: "h-12 px-7 text-body",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  // Label slides up and is replaced by a copy on hover. Off for icon-only buttons and asChild.
  roll?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, roll, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isIcon = size === "icon" || size === "icon-sm"
    const shouldRoll = (roll ?? !isIcon) && !asChild

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {shouldRoll ? <RollLabel>{children}</RollLabel> : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

const rollLayer =
  "flex items-center justify-center gap-2 transition-transform duration-500 ease-in-out-quart motion-reduce:transition-none"

function RollLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative block overflow-hidden">
      <span className={cn(rollLayer, "group-hover/btn:-translate-y-full")}>{children}</span>
      <span
        aria-hidden
        className={cn(rollLayer, "absolute inset-0 translate-y-full group-hover/btn:translate-y-0")}
      >
        {children}
      </span>
    </span>
  )
}

export { Button, buttonVariants }
