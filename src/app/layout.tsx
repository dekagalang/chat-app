import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClientProvider } from "@/lib/query-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat App",
  description: "Chat application copied from Autolaris module",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <QueryClientProvider>
            <ConfigProvider>{children}</ConfigProvider>
          </QueryClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
