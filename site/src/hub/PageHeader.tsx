interface Props {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className }: Props) {
  const cls = ["page-header", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
  );
}
