import type { ReactNode } from "react";

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}