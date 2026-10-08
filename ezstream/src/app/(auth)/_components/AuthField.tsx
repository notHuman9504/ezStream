import { Input, type InputProps } from "@/components/ui/input"

type AuthFieldProps = InputProps & {
  id: string
  label: string
}

export function AuthField({ id, label, ...props }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-small font-medium text-fg-50">
        {label}
      </label>
      <Input id={id} {...props} />
    </div>
  )
}

// Always mounted so screen readers pick up the message when it appears. Each
// failed attempt clears and re-sets it, so it eases in again every time.
export function FormError({ id, message }: { id: string; message: string }) {
  return (
    <div id={id} aria-live="assertive" aria-atomic="true">
      {message && (
        <p className="mt-4 flex items-start gap-2.5 rounded-field bg-danger/10 px-4 py-3 text-body-sm text-danger animate-in fade-in slide-in-from-top-1 [animation-duration:300ms] motion-reduce:animate-none">
          <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-current" />
          {message}
        </p>
      )}
    </div>
  )
}
