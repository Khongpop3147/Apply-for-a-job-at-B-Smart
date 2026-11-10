import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Section({
  index,
  title,
  description,
  children,
  id,
}: {
  index: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">
      <header className="mb-5 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-ink"
        >
          {index}
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base text-ink placeholder:text-faint " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent-strong " +
  "disabled:bg-subtle disabled:text-muted";

const borderFor = (invalid?: boolean) => (invalid ? "border-danger" : "border-line-strong hover:border-faint");

type InputProps = ComponentProps<"input"> & { invalid?: boolean; suffix?: ReactNode };

export function TextInput({ invalid, suffix, className, id, ...rest }: InputProps) {
  const input = (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cx(controlBase, borderFor(invalid), suffix ? "pr-14" : undefined, className)}
      {...rest}
    />
  );
  if (!suffix) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
        {suffix}
      </span>
    </div>
  );
}

export function Select({
  invalid,
  className,
  id,
  children,
  ...rest
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cx(controlBase, borderFor(invalid), "appearance-none bg-select pr-9", className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className,
  id,
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cx(controlBase, borderFor(invalid), "min-h-28 resize-y leading-relaxed", className)}
      {...rest}
    />
  );
}

/** กลุ่มปุ่มเลือก (radio) แบบชิป — ใช้กับ register() ได้ตรง ๆ */
export function ChoiceGroup({
  legend,
  name,
  options,
  required,
  error,
  className,
  inputProps,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  error?: string;
  className?: string;
  inputProps: ComponentProps<"input">;
}) {
  return (
    <fieldset className={cx("flex min-w-0 flex-col gap-1.5", className)} aria-invalid={!!error || undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">
        {legend}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" value={o.value} className="peer sr-only" {...inputProps} name={name} />
            <span
              className={cx(
                "inline-flex min-h-10 items-center rounded-full border px-4 text-sm text-ink transition-colors",
                "peer-checked:border-accent-strong peer-checked:bg-accent-soft peer-checked:font-semibold",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60",
                error ? "border-danger" : "border-line-strong hover:border-faint",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function Checkbox({
  children,
  error,
  id,
  ...rest
}: ComponentProps<"input"> & { error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error || undefined}
          className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--accent-strong)]"
          {...rest}
        />
        <span className="text-sm leading-relaxed text-ink">{children}</span>
      </label>
      {error ? (
        <p role="alert" className="pl-8 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
