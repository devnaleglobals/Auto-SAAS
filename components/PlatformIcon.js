export default function PlatformIcon({ platform, className = 'h-4 w-4' }) {
  if (platform === 'FACEBOOK') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-label="Facebook" role="img">
        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Instagram" role="img">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
