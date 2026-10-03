import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow] [transition-duration:var(--duration-feedback)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none aria-busy:pointer-events-none aria-busy:cursor-wait aria-busy:bg-disabled aria-busy:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-pressed",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover active:bg-destructive-pressed focus-visible:ring-destructive",
        outline:
          "border border-input bg-surface text-foreground shadow-sm hover:bg-secondary-hover active:bg-secondary-pressed",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed",
        ghost:
          "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary-pressed",
        link: "bg-transparent text-primary underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        default: "h-11 px-4 has-[>svg]:px-3",
        sm: "h-11 gap-1.5 px-3 has-[>svg]:px-3",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
