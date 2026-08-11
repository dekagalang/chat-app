"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  titleContent?: ReactNode;
  onBack?: () => void;
  rightContent?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  titleContent,
  onBack,
  rightContent,
  children,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white shadow-md">
      <div className="flex h-14 items-center gap-3 px-4">
        {onBack && (
          <Button
            unstyled
            onClick={onBack}
            className="rounded-lg p-2 text-gray-800 transition hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ArrowLeftOutlined
              className="text-lg"
              style={{ color: "#111827" }}
            />
          </Button>
        )}

        {titleContent || (
          <h1 className="m-0! flex-1 text-lg font-semibold text-gray-800">
            {title}
          </h1>
        )}

        {rightContent}
      </div>

      {children}
    </div>
  );
}
