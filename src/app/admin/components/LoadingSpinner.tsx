export default function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="w-8 h-8 border-3 border-admin-line border-t-admin-primary rounded-full animate-spin" />
    </div>
  );
}
