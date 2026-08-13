import { cn } from "@/lib/utils";

const CONTROL_CLASS =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-body text-ink transition-colors placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-100";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
};

/** Label + control + error, wired for screen readers. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-label font-medium text-ink-secondary"
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-label text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-label text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASS, "h-10", className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(CONTROL_CLASS, "py-2 leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL_CLASS, "h-10", className)} {...props} />;
}
