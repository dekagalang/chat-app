"use client";

import Image from "next/image";
import type {
  ConversationSummary,
  UserType,
} from "@/features/chat/hooks/useSocketChat";
import { formatDateLabel, getAvatarInitial } from "@/features/chat/utils";

export default function ChatList({
  loading,
  summaries,
  selectedConversationId,
  onOpenConversation,
  userType,
}: {
  loading: boolean;
  summaries: ConversationSummary[];
  selectedConversationId: string | null;
  onOpenConversation: (
    conversationId: string,
    summary?: ConversationSummary,
  ) => void;
  userType: UserType;
}) {
  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto px-4 py-4">
      {loading ? (
        <div className="px-3 py-10 text-center text-sm text-gray-500">
          Memuat daftar chat...
        </div>
      ) : summaries.length === 0 ? (
        <div className="px-3 py-10 text-center text-sm text-gray-500">
          Tidak ada chat untuk peran ini.
        </div>
      ) : (
        summaries.map((item) => (
          <button
            key={item.conversationId}
            type="button"
            onClick={() => onOpenConversation(item.conversationId, item)}
            className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-4 text-left transition-colors ${
              item.conversationId === selectedConversationId
                ? "bg-slate-50"
                : "hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
              {userType === "seller" ? (
                getAvatarInitial(item.partnerName)
              ) : item.partnerImage ? (
                <Image
                  src={item.partnerImage}
                  alt={item.partnerName || "Partner"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                getAvatarInitial(item.partnerName)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                    className={`min-w-0 flex-1 truncate text-lg ${
                    item.unreadCount > 0
                      ? "font-semibold text-gray-900"
                        : "font-semibold text-gray-900"
                  }`}
                >
                  {item.partnerName}
                </h3>
                <span className="shrink-0 text-xs text-gray-400">
                  {item.lastMessageAt ? formatDateLabel(item.lastMessageAt) : ""}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p
                  className={`min-w-0 flex-1 truncate text-sm ${
                    item.unreadCount > 0 ? "font-medium text-gray-700" : "text-gray-500"
                  }`}
                >
                  {item.lastMessage}
                </p>
                {item.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-2 text-[11px] font-semibold leading-none text-white">
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
