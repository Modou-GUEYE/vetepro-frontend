import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

const control =
  'w-full rounded-lg border border-line bg-white px-[11px] py-2 text-[13px] outline-none transition placeholder:text-faint hover:border-[#b9c8d1] focus:border-brand focus:shadow-ring disabled:bg-mist';

interface FieldShellProps { label?: string; error?: string; hint?: string; className?: string; id: string; children: ReactNode }

function FieldShell({ label, error, hint, className, id, children }: FieldShellProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[.7px] text-slate">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

type Shared = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Shared>(function Input(
  { label, error, hint, wrapperClassName, className, id, ...rest },
  ref,
) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
      <input ref={ref} id={fid} aria-invalid={!!error} className={clsx(control, error && 'border-danger', className)} {...rest} />
    </FieldShell>
  );
});

/** Sélecteur de date natif (format ISO yyyy-mm-dd côté valeur). */
export const DatePicker = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & Shared>(
  function DatePicker(props, ref) {
    return <Input ref={ref} type="date" {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Shared>(function Select(
  { label, error, hint, wrapperClassName, className, id, children, ...rest },
  ref,
) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
      <select ref={ref} id={fid} aria-invalid={!!error} className={clsx(control, error && 'border-danger', className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Shared>(
  function Textarea({ label, error, hint, wrapperClassName, className, id, ...rest }, ref) {
    const uid = useId();
    const fid = id ?? uid;
    return (
      <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
        <textarea ref={ref} id={fid} aria-invalid={!!error} className={clsx(control, 'min-h-[60px] resize-y', error && 'border-danger', className)} {...rest} />
      </FieldShell>
    );
  },
);

/** Champ mot de passe avec bouton afficher / masquer. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & Shared>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={clsx('pr-10', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className={clsx('absolute right-2 text-slate hover:text-ink', props.label ? 'top-[30px]' : 'top-2')}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
