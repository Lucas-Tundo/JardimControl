"use client";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
