import { Link } from 'react-router-dom';

interface BrandProps {
  to?: string;
  label?: string;
}

/** Logo EaterSive yang dipakai di header landing, alur checkout, dan owner. */
export default function Brand({ to = '/', label = 'EaterSive, ke beranda' }: BrandProps) {
  return (
    <Link className="brand" to={to} aria-label={label}>
      <span className="brand-mark" aria-hidden="true">
        <img src="/eatersive-logo.png" alt="" />
      </span>
      <span>
        Eater<span className="brand-accent">Sive</span>
      </span>
    </Link>
  );
}
