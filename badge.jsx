const variants = {
  default: "bg-slate-900 text-white",
  secondary: "bg-slate-200 text-slate-900",
};

export function Badge({ className = "", variant = "default", children }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[variant] || variants.default} ${className}`}>{children}</span>;
}
