/** Accessible, non-blocking status text shown over the 3D stage. */
export function ViewerStatus({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted"
    >
      {text}
    </div>
  );
}
