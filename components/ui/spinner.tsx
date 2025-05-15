export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900 ${className}`}
    ></div>
  )
}
