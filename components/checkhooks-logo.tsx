type LogoProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export function CheckhookMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 32" fill="none" aria-hidden="true">
      <rect width="36" height="32" rx="16" fill="#F6821F" />
      <path d="M23.8 10.1a8.1 8.1 0 1 0 .2 11.6" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="m17.2 16.3 3.1 3.1 6.2-6.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckhooksLogo({ inverse = false, compact = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <CheckhookMark className="h-8 w-9 shrink-0" />
      {!compact ? <span className={`text-[19px] font-bold tracking-[-0.04em] ${inverse ? "text-white" : "text-[#111111]"}`}>checkhooks</span> : null}
    </span>
  );
}
