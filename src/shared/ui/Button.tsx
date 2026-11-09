import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

const variants = {
  primary: 'bg-gradient-to-b from-brand-light to-brand text-white shadow-[0_1px_2px_rgba(11,42,48,.2),0_4px_10px_rgba(14,124,123,.22)] hover:from-[#17b0ac] hover:to-brand-light',
  secondary: 'bg-white border border-line text-ink hover:bg-mist hover:border-[#cbd6dd]',
  danger: 'bg-danger-pale text-danger hover:bg-danger hover:text-white',
  amber: 'bg-amber-pale text-amber hover:bg-amber hover:text-white',
  violet: 'bg-violet-pale text-violet hover:bg-violet hover:text-white',
  info: 'bg-info-pale text-info hover:bg-info hover:text-white',
  success: 'bg-brand-pale text-brand-text hover:bg-brand hover:text-white',
  ghost: 'text-slate hover:bg-mist',
} as const;

const sizes = { sm: 'px-[11px] py-[5px] text-xs rounded-lg', md: 'px-[15px] py-2 text-[13px] rounded-[10px]', icon: 'p-2 rounded-[9px]' } as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-[.97] focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});
