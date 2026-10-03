import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type RecordFeedback = { text: string; tone?: "warning" } | null;

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onChange" | "value"> {
  id: string;
  label: string;
  hint?: string;
  description?: string;
  /** Rendered in the same row as the input, e.g. an "add" button. */
  action?: ReactNode;
  value: string;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  onValueChange: (value: string) => void;
}

export function TextField({
  id,
  label,
  hint,
  description,
  action,
  value,
  error,
  inputRef,
  onValueChange,
  className,
  ...rest
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const describedBy = [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {hint && <span className="text-muted-foreground font-normal"> ({hint})</span>}
      </label>
      {description && (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      )}
      <div className="flex gap-2">
        <input
          {...rest}
          id={id}
          ref={inputRef}
          value={value}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          className={cn(
            "border-input bg-surface focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:border-destructive h-11 w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2",
            className,
          )}
        />
        {action}
      </div>
      {error && (
        <p id={errorId} className="text-destructive flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function StatusLine({ feedback }: { feedback: RecordFeedback }) {
  const warning = feedback?.tone === "warning";
  const Icon = warning ? TriangleAlert : CheckCircle2;
  return (
    <div role="status" aria-live="polite" className="mt-4 empty:hidden">
      {feedback && (
        <p className={cn("flex items-start gap-2 text-sm", warning ? "text-attention-foreground" : "text-safe")}>
          <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {feedback.text}
        </p>
      )}
    </div>
  );
}

/** Moves focus after the DOM has re-rendered, so keyboard users do not lose their place. */
export function focusSoon(target: () => HTMLElement | null) {
  requestAnimationFrame(() => {
    target()?.focus();
  });
}
