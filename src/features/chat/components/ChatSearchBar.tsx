"use client";

import { CloseCircleFilled, SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";

export default function ChatSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 bg-white px-3 py-3">
      <Input
        allowClear={{
          clearIcon: <CloseCircleFilled className="text-lg text-gray-400" />,
        }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cari nama..."
        prefix={<SearchOutlined className="text-gray-400" />}
        className="rounded-lg"
        style={{ height: 40 }}
        aria-label="Cari chat berdasarkan nama"
      />
    </div>
  );
}
