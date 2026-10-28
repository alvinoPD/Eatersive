import { Link } from 'react-router-dom';

interface BrandProps {
  to?: string;
  label?: string;
  variant?: 'shoe' | 'spark';
}

/** Logo EaterSive yang dipakai di header landing, alur checkout, dan owner. */
export default function Brand({
  to = '/',
  label = 'EaterSive, ke beranda',
  variant = 'shoe',
}: BrandProps) {
  return (
    <Link className="brand" to={to} aria-label={label}>
      <span className="brand-mark" aria-hidden="true">
        {variant === 'spark' ? (
          '✳'
        ) : (
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 14.2c2.1-.2 3.6-1.5 4.5-4.1l1.3.5c1.5 2.2 3.2 3.6 6.1 4l3.3.5c1.2.2 1.9 1 1.9 2.1 0 1.2-.9 2-2.1 2H6.2C4.4 19.2 3 18 3 16.4c0-.9.4-1.6 1-2.2Z"
              fill="currentColor"
            />
            <path
              d="m9.7 11.2 1.2.8m1.1.1 1.2.7m1.2.1 1.2.6"
              stroke="#fff"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span>
        Eater<span className="brand-accent">Sive</span>
      </span>
    </Link>
  );
}
