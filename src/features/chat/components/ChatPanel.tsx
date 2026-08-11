"use client";

import React from "react";
import Image from "next/image";
import { Input } from "antd";
import { Button } from "@/components/ui/Button";
import ChatMessage from "@/features/chat/components/ChatMessage";
import type {
  ChatMessage as SocketChatMessage,
  UserType,
} from "@/features/chat/hooks/useSocketChat";

export default function ChatPanel({
  selectedConversationId,
  messages,
  savedPartnerProfile,
  partnerAvatarClass,
  partnerAvatarLabel,
  partnerName,
  statusLabel,
  showScrollToBottom,
  text,
  onTextChange,
  handleSend,
  handleScrollToBottom,
  messageListRef,
  userId,
  userType,
  partnerType,
}: {
  selectedConversationId: string | null;
  messages: SocketChatMessage[];
  savedPartnerProfile: {
    id?: string;
    name?: string;
    image?: string;
    type?: UserType;
  } | null;
  partnerAvatarClass: string;
  partnerAvatarLabel: string;
  partnerName: string;
  statusLabel: string;
  showScrollToBottom: boolean;
  text: string;
  onTextChange: (value: string) => void;
  handleSend: () => void;
  handleScrollToBottom: () => void;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  userId: string;
  userType: UserType;
  partnerType: UserType;
}) {
  return (
    <main className="flex-1 bg-slate-50">
      <div className="flex h-[calc(100vh-56px)] flex-col">
        {selectedConversationId ? (
          <>
            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${partnerAvatarClass} text-sm font-semibold shadow-sm`}
                >
                  {savedPartnerProfile?.image ? (
                    <Image
                      src={savedPartnerProfile.image}
                      alt={savedPartnerProfile.name || "Partner"}
                      width={48}
                      height={48}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    partnerAvatarLabel
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {partnerName}
                  </div>
                  <div className="text-sm text-gray-500">{statusLabel}</div>
                </div>
              </div>
            </div>

            <div ref={messageListRef} className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 ? (
                <div className="mx-auto mt-12 w-full max-w-xl rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
                  Chat kosong. Klik tombol kirim untuk memulai percakapan.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message, idx) => {
                    const previous = messages[idx - 1];
                    const currentDate = message.createdAt
                      ? new Date(message.createdAt).toDateString()
                      : "";
                    const previousDate = previous?.createdAt
                      ? new Date(previous.createdAt).toDateString()
                      : "";
                    const showDateHeader = idx === 0 || currentDate !== previousDate;

                    return (
                      <React.Fragment key={message._id ?? idx}>
                        {showDateHeader && (
                          <div className="my-4 flex justify-center">
                            <div className="rounded-xl bg-white px-4 py-1 text-xs text-gray-500 shadow-sm">
                              {message.createdAt
                                ? new Date(message.createdAt).toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })
                                : ""}
                            </div>
                          </div>
                        )}
                        <ChatMessage
                          message={message}
                          currentUserId={userId}
                          currentUserType={userType}
                          partnerType={partnerType}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3 rounded-full border border-sky-200 bg-white px-3 py-2 shadow-sm">
                <Input.TextArea
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  onPressEnter={(e) => {
                    if (e.shiftKey) return;
                    e.preventDefault();
                    handleSend();
                  }}
                  placeholder="Tulis pesan..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  className="flex-1 bg-transparent text-black placeholder:text-slate-400"
                  style={{ resize: "none", minHeight: 44 }}
                  variant="borderless"
                />
                <Button
                  type="primary"
                  onClick={handleSend}
                  className="rounded-full px-5 py-2"
                >
                  Kirim
                </Button>
              </div>
            </div>
            {showScrollToBottom && (
              <div className="fixed bottom-28 right-6 z-50">
                <Button
                  type="primary"
                  shape="circle"
                  onClick={handleScrollToBottom}
                  className="flex h-11 w-11 items-center justify-center p-0 shadow-lg"
                >
                  ↓
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-10">
            <div className="w-full max-w-xl rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Tidak ada chat saat ini</div>
              <p className="mt-3 text-sm text-gray-500">
                Mulai percakapan dengan memilih chat dari daftar atau masuk sebagai buyer untuk membuat chat baru.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
