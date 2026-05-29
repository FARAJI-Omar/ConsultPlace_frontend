import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
}

export default function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  return (
    <>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex cursor-wait items-center justify-center bg-[#ffffff]/80">
          <Loader2 className="h-10 w-10 animate-spin text-[#3b82f6]" />
        </div>
      )}
    </>
  );
}
