import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";

type BottomActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function BottomActionBar({ children, className }: BottomActionBarProps) {
  return (
    <div
      className={classNames(
        "fixed bottom-0 left-0 right-0 z-50 flex gap-2 border-t border-gray-200 bg-white px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
