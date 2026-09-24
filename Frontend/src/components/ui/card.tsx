/**
 * Card — shadcn/ui primitive.
 *
 * Provides the four-part card anatomy used by every dashboard tile:
 *   <Card>
 *     <CardHeader>…<CardTitle>…</CardTitle>…</CardHeader>
 *     <CardContent>…</CardContent>
 *     <CardFooter>…</CardFooter> (optional)
 *   </Card>
 *
 * All variants forward `className` and spread extra props so call sites can
 * extend layout (e.g. `className="col-span-2"` on the BatteryCard).
 *
 * MUST — frontend.md §3.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, DivProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 pb-2", className)} {...props} />;
});

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn("text-sm font-medium text-muted-foreground", className)}
        {...props}
      />
    );
  },
);

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />;
});

export const CardContent = React.forwardRef<HTMLDivElement, DivProps>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, DivProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />;
});
