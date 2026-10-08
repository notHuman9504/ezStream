import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,opacity,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-fg text-background",
        // For use on the light menu sheet.
        dark: "bg-background text-fg",
        secondary: "bg-muted text-fg hover:bg-elevated",
        ghost: "text-fg hover:bg-fg/10",
        accent: "bg-brand text-background",
        danger: "bg-danger/15 text-danger hover:bg-danger/25",
      },
      size: {
        sm: "h-10 px-4 text-[0.9375rem] tracking-[-0.03em]",
        md: "h-12 pl-5 pr-4 text-btn",
        lg: "h-14 pl-6 pr-5 text-[1.1875rem] tracking-[-0.035em]",
        icon: "size-12",
        "icon-sm": "size-10",
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
  // Trailing dot after the label. Defaults to on for plain-text labels.
  dot?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, dot, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isText = typeof children === "string"
    const isIcon = size === "icon" || size === "icon-sm"
    const showDot = (dot ?? isText) && !isIcon && !asChild

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {isText && !asChild ? <RollText text={children} /> : children}
        {showDot && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-current transition-transform duration-500 ease-spring group-hover/btn:scale-[1.7] motion-reduce:transition-none"
          />
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// Each letter slides up and is replaced by its own copy (a text-shadow one line
// below), staggered left to right.
function RollText({ text }: { text: string }) {
  return (
    <span className="relative block h-[1.15em] overflow-hidden leading-[1.15]">
      <span aria-hidden className="flex">
        {Array.from(text).map((char, i) => (
          <span
            key={i}
            className="inline-block transition-transform duration-500 ease-spring [text-shadow:0_1.15em_0_currentColor] group-hover/btn:-translate-y-[1.15em] motion-reduce:transition-none"
            style={{ transitionDelay: `${i * 12}ms` }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

export { Button, buttonVariants }
