import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router';

const VARIANTS = {
  primary: 'bg-leaf-700 text-white hover:bg-leaf-800 active:bg-leaf-900',
  secondary: 'border-2 border-leaf-700 bg-white text-leaf-800 hover:bg-leaf-50',
  danger: 'bg-danger-700 text-white hover:bg-danger-800',
  ghost: 'bg-transparent text-leaf-800 hover:bg-leaf-50',
};

const BASE =
  'inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-3 text-lg font-semibold leading-snug transition-colors disabled:cursor-not-allowed disabled:opacity-60';

// Icon plus label on every action: the icon helps people who read slowly, the label removes doubt.
// Pass `to` to render a link that looks like a button (navigation), `href` for a plain link
// (for example tel: to call someone), otherwise it is a <button>.
export function BigButton({
  icon: Icon,
  children,
  variant = 'primary',
  fullWidth = true,
  loading = false,
  disabled = false,
  to,
  href,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`;
  const content = (
    <>
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-6 shrink-0 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" className="size-6 shrink-0" />
      )}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
}
