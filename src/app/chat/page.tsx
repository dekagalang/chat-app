"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import type {
  UserType,
  ConversationItem,
  MessageItem,
  ConversationSummary,
  ChatSocketMessage,
} from "@/hooks/useSocketChat";

const CHAT_API_BASE =
  process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8000";

const DEFAULT_CONVERSATIONS: ConversationItem[] = [
  {
    id: "buyer-seller",
    participants: ["buyer", "seller"],
  },
  {
    id: "buyer-cs",
    participants: ["buyer", "cs"],
  },
];

const getPartnerName = (userType: UserType, partnerId: string) => {
  if (partnerId === "buyer") return "Buyer";
  if (partnerId === "seller") return "Seller";
  if (partnerId === "cs") return "Customer Service";

  return partnerId;
};

const getConversationTitle = (conversationId: string, userType: UserType) => {
  const partnerId =
    conversationId.split("-").find((id) => id !== userType) ?? "";

  return getPartnerName(userType, partnerId);
};

const formatTime = (time?: string) => {
  if (!time) return "";

  const date = new Date(time);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDateLabel = (time?: string) => {
  if (!time) return "";

  const date = new Date(time);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatTime(time);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Kemarin";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
  });
};

const getMessagePreview = (message?: MessageItem | null) => {
  if (!message) return "Mulai chat";

  if (typeof message.text === "string" && message.text.trim().length > 0) {
    return message.text;
  }

  if (message.type === "order") return "Pesanan";

  if (message.type === "product") return "Produk";

  return "Pesan baru";
};

const canSeeConversation = (
  conversation: ConversationItem,
  userType: UserType,
) => {
  if (!conversation.participants.includes(userType)) {
    return false;
  }

  if (userType === "buyer") {
    return true;
  }

  if (userType === "seller") {
    return conversation.id === "buyer-seller";
  }

  if (userType === "cs") {
    return conversation.id === "buyer-cs";
  }

  return false;
};

const getAvatarInitial = (name: string) => {
  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
};

export default function ChatListPage() {
  const router = useRouter();

  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [userType] = useState<UserType>(() => {
    if (typeof window === "undefined") {
      return "buyer";
    }

    return (
      (window.sessionStorage.getItem("chatUserType") as UserType) ?? "buyer"
    );
  });

  const [userId] = useState(() => {
    if (typeof window === "undefined") {
      return "buyer";
    }

    return window.sessionStorage.getItem("chatUserId") ?? "buyer";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem("chatUserType", userType);
    window.sessionStorage.setItem("chatUserId", userId);
  }, [userType, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !userType) {
      return;
    }

    const socket = io(CHAT_API_BASE, {
      query: { userId, userType },
      transports: ["websocket", "polling"],
    });

    const joinConversationRooms = () => {
      DEFAULT_CONVERSATIONS.filter((conversation) =>
        canSeeConversation(conversation, userType),
      ).forEach((conversation) => {
        socket.emit("join-conversation", { conversationId: conversation.id });
      });
    };

    const updateSummary = (message: ChatSocketMessage) => {
      if (!message.conversationId) return;

      const conversationId = message.conversationId;
      const isIncoming = message.senderId !== userId;
      const preview = getMessagePreview({
        ...message,
        text: message.text ?? undefined,
      });
      const lastMessageAt = message.createdAt || new Date().toISOString();

      setSummaries((prev) => {
        const existing = prev.find((item) => item.conversationId === conversationId);

        const unreadCount = existing
          ? existing.unreadCount + (isIncoming ? 1 : 0)
          : isIncoming
          ? 1
          : 0;

        const conversationItem: ConversationSummary = {
          conversationId,
          partnerId: getConversationTitle(conversationId, userType),
          partnerName: getConversationTitle(conversationId, userType),
          lastMessage: preview,
          lastMessageAt,
          unreadCount,
        };

        if (existing) {
          return [
            ...prev
              .map((item) =>
                item.conversationId === message.conversationId
                  ? {
                      ...item,
                      lastMessage: preview,
                      lastMessageAt,
                      unreadCount,
                    }
                  : item,
              )
              .sort((a, b) => {
                if (!a.lastMessageAt) return 1;
                if (!b.lastMessageAt) return -1;
                return (
                  new Date(b.lastMessageAt).getTime() -
                  new Date(a.lastMessageAt).getTime()
                );
              }),
          ];
        }

        return [conversationItem, ...prev].sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return (
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
          );
        });
      });
    };

    socket.on("connect", joinConversationRooms);
    socket.on("chatMessage", updateSummary);
    socket.on("messagesRead", (payload: { conversationId?: string; readerId?: string }) => {
      if (!payload?.conversationId || payload.readerId !== userId) {
        return;
      }

      setSummaries((prev) =>
        prev.map((item) =>
          item.conversationId === payload.conversationId
            ? { ...item, unreadCount: 0 }
            : item,
        ),
      );
    });
    socket.connect();

    return () => {
      socket.off("connect", joinConversationRooms);
      socket.off("chatMessage", updateSummary);
      socket.off("messagesRead", () => {});
      socket.disconnect();
    };
  }, [userId, userType]);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      setLoading(true);

      try {
        const res = await fetch(`${CHAT_API_BASE}/conversations`);

        const data = (await res.json()) as Array<
          ConversationItem & {
            conversationId?: string;
            partner?: {
              id?: string | number | null;
              name?: string | null;
              image?: string | null;
              type?: string | null;
            } | null;
          }
        >;

        const available = data.filter((conversation) => {
          const conversationId =
            conversation.conversationId ?? conversation.id ?? "";
          const participants = Array.isArray(conversation.participants)
            ? conversation.participants
            : DEFAULT_CONVERSATIONS.find((c) => c.id === conversationId)
                ?.participants ?? [];

          return canSeeConversation(
            { id: conversationId, participants },
            userType,
          );
        });

        const details = await Promise.all(
          available.map(async (conversation) => {
            const rawConversationId =
              conversation.conversationId ?? conversation.id ?? "";

            try {
              const res = await fetch(
                `${CHAT_API_BASE}/messages/${rawConversationId}`,
              );

              const messages = (await res.json()) as MessageItem[];

              const lastMessage = messages.length
                ? messages[messages.length - 1]
                : null;

              const unreadCount = messages.reduce((count, message) => {
                if (message.senderId !== userId && !message.isRead) {
                  return count + 1;
                }

                return count;
              }, 0);

              const partnerName =
                conversation.partner?.name ??
                getConversationTitle(rawConversationId, userType);

              const partnerId =
                conversation.partner?.id ??
                (conversation.participants?.find((id) => id !== userType) ?? "");

              const partnerImage = conversation.partner?.image ?? "";

              return {
                conversationId: rawConversationId,
                partnerId,
                partnerName,
                partnerImage,
                lastMessage: getMessagePreview(lastMessage),
                lastMessageAt: lastMessage?.createdAt,
                unreadCount,
              } as ConversationSummary;
            } catch {
              const partnerName =
                conversation.partner?.name ??
                getConversationTitle(rawConversationId, userType);

              const partnerId =
                conversation.partner?.id ??
                (conversation.participants?.find((id) => id !== userType) ?? "");

              const partnerImage = conversation.partner?.image ?? "";

              return {
                conversationId: rawConversationId,
                partnerId,
                partnerName,
                partnerImage,
                lastMessage: "Mulai chat",
                lastMessageAt: undefined,
                unreadCount: 0,
              } as ConversationSummary;
            }
          }),
        );

        if (!active) {
          return;
        }

        setSummaries(
          details.sort((a, b) => {
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return (
              new Date(b.lastMessageAt).getTime() -
              new Date(a.lastMessageAt).getTime()
            );
          }),
        );
      } catch {
        if (!active) {
          return;
        }

        setSummaries([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      active = false;
    };
  }, [userType, userId]);

  const openConversation = (
    conversationId: string,
    summary?: ConversationSummary,
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    const partnerType = conversationId.includes("seller")
      ? "seller"
      : conversationId.includes("cs")
      ? "cs"
      : "buyer";

    const partnerName =
      summary?.partnerName ?? getConversationTitle(conversationId, userType);

    window.sessionStorage.setItem("chatConversationId", conversationId);
    window.sessionStorage.setItem(
      "chatPartnerId",
      summary?.partnerId ?? partnerType,
    );
    window.sessionStorage.setItem("chatPartnerType", partnerType);
    window.sessionStorage.setItem(
      "chatPartnerSnapshot",
      JSON.stringify({
        id: summary?.partnerId ?? partnerType,
        name: partnerName,
        image: summary?.partnerImage ?? "",
        type: partnerType,
      }),
    );

    window.sessionStorage.setItem("chatUserType", userType);
    window.sessionStorage.setItem("chatUserId", userId);

    window.sessionStorage.removeItem("chatProductSlug");
    window.sessionStorage.removeItem("chatOrderSnapshot");

    router.replace("/chat/live");
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Chat" onBack={() => router.back()} />

      <div className="pb-24">
        <div>
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              Memuat daftar chat...
            </div>
          ) : summaries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              Tidak ada chat untuk peran ini.
            </div>
          ) : (
            summaries.map((item) => (
              <button
                key={item.conversationId}
                type="button"
                onClick={() => openConversation(item.conversationId, item)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                  {item.partnerImage ? (
                    <Image
                      src={item.partnerImage}
                      alt={item.partnerName || "Partner"}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getAvatarInitial(item.partnerName)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        item.unreadCount > 0
                          ? "font-semibold text-gray-900"
                          : "font-medium text-gray-800"
                      }`}
                    >
                      {item.partnerName}
                    </h3>

                    <span
                      className={`shrink-0 text-xs ${
                        item.unreadCount > 0
                          ? "font-medium text-gray-600"
                          : "text-gray-400"
                      }`}
                    >
                      {item.lastMessageAt
                        ? formatDateLabel(item.lastMessageAt)
                        : ""}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={`min-w-0 flex-1 truncate text-sm ${
                        item.unreadCount > 0
                          ? "font-medium text-gray-700"
                          : "text-gray-500"
                      }`}
                    >
                      {item.lastMessage}
                    </p>

                    {item.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-2 text-[11px] font-semibold leading-none text-white">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
