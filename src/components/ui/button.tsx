import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#112458] text-white shadow-[0_8px_22px_rgba(17,36,88,0.28)] hover:bg-[#1a3578] hover:shadow-[0_12px_26px_rgba(17,36,88,0.36)] focus-visible:ring-[#dbe2f0]",
        secondary:
          "bg-[#f6f8fc] text-[#0f172a] border border-[#e8ecf3] hover:bg-[#eef2f9] focus-visible:ring-[#dbe2f0]",
        outline:
          "border border-[#e8ecf3] bg-white text-[#0f172a] hover:bg-[#f6f8fc] hover:text-[#112458] focus-visible:ring-[#dbe2f0]",
        ghost: "text-[#64748b] hover:bg-[#f6f8fc] hover:text-[#0f172a]",
        link: "text-[#112458] underline-offset-4 hover:underline",
        accent:
          "bg-[#ffd923] text-[#112458] shadow-[0_8px_22px_rgba(255,217,35,0.28)] hover:bg-[#ffe45c] hover:shadow-[0_12px_26px_rgba(255,217,35,0.36)] focus-visible:ring-[#ffd923]",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        xl: "h-14 rounded-full px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
