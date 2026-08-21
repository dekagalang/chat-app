"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import type {
  ChatMessage as SocketChatMessage,
  ConversationItem,
  ConversationSummary,
  MessageItem,
  UserType,
} from "@/features/chat/hooks/useSocketChat";
import useSocketChat from "@/features/chat/hooks/useSocketChat";
import ChatList from "@/features/chat/components/ChatList";
import ChatPanel from "@/features/chat/components/ChatPanel";
import {
  canSeeConversation,
  getConversationTitle,
  getMessagePreview,
} from "@/features/chat/utils";

const CHAT_API_BASE =
  process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:5001";

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

const isIncomingForUser = (
  message: { senderId?: string; senderType?: string | null; sender?: { type?: string } },
  userId: string,
  userType: UserType,
) => {
  const senderType = message.sender?.type ?? message.senderType;
  if (senderType && senderType !== userType) {
    return true;
  }

  return Boolean(message.senderId && message.senderId !== userId);
};

export default function ChatPage() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const initialConversationLoadRef = useRef(true);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const [userType, setUserType] = useState<UserType>("buyer");
  const [userId, setUserId] = useState<string>("buyer");
  const [identityReady, setIdentityReady] = useState(false);
  const [savedPartnerProfile, setSavedPartnerProfile] = useState<{
    id?: string;
    name?: string;
    image?: string;
    type?: UserType;
  } | null>(null);
  const [text, setText] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef(true);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const resolvePartnerFromConversation = useCallback(
    (
      conversation: ConversationItem & {
        conversationId?: string;
        threadId?: string;
        partner?: {
          id?: string | number | null;
          name?: string | null;
          image?: string | null;
          type?: string | null;
        } | null;
      },
    ) => {
      const conversationId =
        conversation.threadId ?? conversation.id ?? conversation.conversationId ?? "";
      const partnerId = conversationId;
      const partnerName =
        conversation.partner?.name ??
        (conversation.partner?.type === "cs" ? "Customer Service" : "Seller");

      const partnerImage = conversation.partner?.image ?? "";

      return { partnerId, partnerName, partnerImage };
    },
    [],
  );

  const handleChatMessage = useCallback(
    (message: SocketChatMessage) => {
      if (!message.conversationId) return;

      const conversationId = message.conversationId;
      const lastMessageAt = message.createdAt || new Date().toISOString();
      const preview = getMessagePreview(message as MessageItem);
      const isIncoming = isIncomingForUser(message, userId, userType);

      setSummaries((prev) => {
        const existing = prev.find(
          (item) => item.conversationId === conversationId,
        );

        if (existing) {
          return prev
            .map((item) =>
              item.conversationId === conversationId
                ? {
                    ...item,
                  partnerName: message.sender?.name ?? item.partnerName,
                    lastMessage: preview,
                    lastMessageAt,
                    unreadCount: existing.unreadCount + (isIncoming ? 1 : 0),
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
            });
        }

        return [
          {
            conversationId,
            partnerId: conversationId,
            partnerName:
              message.sender?.name ?? getConversationTitle(conversationId, userType),
            lastMessage: preview,
            lastMessageAt,
            unreadCount: isIncoming ? 1 : 0,
          },
          ...prev,
        ].sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return (
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
          );
        });
      });
    },
    [userId, userType],
  );

  const { messages, send, statuses, markConversationRead } = useSocketChat({
    url: CHAT_API_BASE,
    userId: identityReady ? userId : undefined,
    userType: identityReady ? userType : undefined,
    conversationId: selectedConversationId ?? undefined,
    onChatMessage: handleChatMessage,
  });

  const clearConversationUnread = useCallback((conversationId: string) => {
    setSummaries((prev) =>
      prev.map((item) =>
        item.conversationId === conversationId
          ? { ...item, unreadCount: 0 }
          : item,
      ),
    );
  }, []);

  useEffect(() => {
    if (!messages.length || !shouldAutoScrollRef.current) return;
    const element = messageListRef.current;
    if (!element) return;

    element.scrollTo({ top: element.scrollHeight, behavior: "auto" });
    setShowScrollToBottom(false);
  }, [messages]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
  }, [selectedConversationId]);

  useEffect(() => {
    if (typeof window === "undefined" || !identityReady) return;
    window.sessionStorage.setItem("chatUserType", userType);
    window.sessionStorage.setItem("chatUserId", userId);
  }, [identityReady, userType, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const sellerRoleFlag =
      params.get("seller")?.trim().toLowerCase() === "seller" ||
      params.get("seller")?.trim().toLowerCase() === "true" ||
      params.get("seller") === "";
    const csRoleFlag =
      params.get("cs")?.trim().toLowerCase() === "cs" ||
      params.get("cs")?.trim().toLowerCase() === "true" ||
      params.get("cs") === "";
    const rawRole =
      params.get("role") ??
      params.get("userType") ??
      params.get("viewer") ??
      (sellerRoleFlag ? "seller" : null) ??
      (csRoleFlag ? "cs" : null);

    const queryUserId =
      params.get("userId") ?? params.get("id") ?? params.get("uid");
    const roleId = queryUserId ?? (rawRole === "seller" ? "seller" : "cs");
    const roleName =
      params.get("sellerName") ??
      params.get("seller_name") ??
      (sellerRoleFlag ? "Seller" : params.get("seller")) ??
      params.get("name") ??
      "Seller";
    const roleImage =
      params.get("sellerImage") ??
      params.get("seller_image") ??
      params.get("sellerAvatar") ??
      params.get("seller_avatar") ??
      params.get("image") ??
      "";

    const storedUserType = window.sessionStorage.getItem(
      "chatUserType",
    ) as UserType | null;
    const storedUserId = window.sessionStorage.getItem("chatUserId");
    const rawPartner = window.sessionStorage.getItem("chatPartnerSnapshot");

    const parsedPartnerProfile = rawPartner
      ? (() => {
          try {
            return JSON.parse(rawPartner);
          } catch {
            return null;
          }
        })()
      : null;

    const applyStoredState = () => {
      if (parsedPartnerProfile) {
        setSavedPartnerProfile(parsedPartnerProfile);
      }

      if (rawRole === "seller" || rawRole === "cs") {
        setUserType(rawRole);
        setUserId(roleId);
        setSavedPartnerProfile({
          id: roleId,
          name: roleName,
          image: roleImage || undefined,
          type: rawRole,
        });
        setIdentityReady(true);

        return;
      }

      if (storedUserType) setUserType(storedUserType);
      if (storedUserId) setUserId(storedUserId);
      setSelectedConversationId(null);
      setIdentityReady(true);
    };

    Promise.resolve().then(applyStoredState);

    // Listen for sessionStorage changes from other tabs/windows (e.g., from live chat page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chatPartnerSnapshot" && e.newValue) {
        try {
          const newProfile = JSON.parse(e.newValue);
          setSavedPartnerProfile(newProfile);
        } catch {
          // ignore parse error
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (!identityReady) return;
    let active = true;

    async function loadConversations() {
      if (initialConversationLoadRef.current) {
        setLoading(true);
      }

      try {
        const query = new URLSearchParams();

        if (userType === "seller") {
          query.set("role", "seller");
        } else if (userType === "cs") {
          query.set("role", "cs");
        } else {
          query.set("role", "buyer");
        }

        if (userId) {
          query.set("userId", userId);
        }

        const roleSpecificUrl = `${CHAT_API_BASE}/conversations${query.toString() ? `?${query.toString()}` : ""}`;
        const roleSpecificRes = await fetch(roleSpecificUrl);
        let data = [] as Array<
          ConversationItem & {
            conversationId?: string;
            threadId?: string;
            partner?: {
              id?: string | number | null;
              name?: string | null;
              image?: string | null;
              type?: string | null;
            } | null;
          }
        >;

        if (roleSpecificRes.ok) {
          data = (await roleSpecificRes.json()) as typeof data;
        }

        const available = data.filter((conversation) => {
          const conversationId =
            conversation.threadId ?? conversation.id ?? conversation.conversationId ?? "";
          const participants = Array.isArray(conversation.participants)
            ? conversation.participants
            : (DEFAULT_CONVERSATIONS.find((c) => c.id === conversationId)
                ?.participants ?? []);

          return canSeeConversation(
            { id: conversationId, participants },
            userType,
          );
        });

        const details = await Promise.all(
          available.map(async (conversation) => {
            const rawConversationId =
              conversation.threadId ?? conversation.id ?? conversation.conversationId ?? "";

            try {
              const res = await fetch(
                `${CHAT_API_BASE}/messages/${rawConversationId}`,
              );

              const messages = (await res.json()) as MessageItem[];
              const lastMessage = messages.length
                ? messages[messages.length - 1]
                : null;
              const unreadCount = messages.reduce((count, message) => {
                if (!message.isRead && isIncomingForUser(message, userId, userType)) {
                  return count + 1;
                }
                return count;
              }, 0);

              const { partnerId, partnerName, partnerImage } =
                resolvePartnerFromConversation(conversation);

              if (messages.length === 0) {
                return null;
              }

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
              return null;
            }
          }),
        );

        if (!active) return;

        const sortedDetails = details.filter(
          (detail): detail is ConversationSummary => detail !== null,
        ).sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return (
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
          );
        });

        setSummaries(sortedDetails);

        if (sortedDetails.length === 0) {
          setSelectedConversationId(null);
          selectedConversationIdRef.current = null;
          setSavedPartnerProfile(null);
        } else if (
          selectedConversationIdRef.current &&
          !sortedDetails.some(
            (item) => item.conversationId === selectedConversationIdRef.current,
          )
        ) {
          setSelectedConversationId(sortedDetails[0].conversationId);
          selectedConversationIdRef.current = sortedDetails[0].conversationId;
        }
      } catch {
        if (!active) return;
        setSummaries([]);
        setSelectedConversationId(null);
        setSavedPartnerProfile(null);
      } finally {
        if (active && initialConversationLoadRef.current) {
          initialConversationLoadRef.current = false;
          setLoading(false);
        }
      }
    }

    loadConversations();
    const refreshTimer = window.setInterval(() => {
      void loadConversations();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [identityReady, userType, userId, resolvePartnerFromConversation]);

  // Sync partner profile when window regains focus (e.g., returning from live chat page)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWindowFocus = () => {
      const rawPartner = window.sessionStorage.getItem("chatPartnerSnapshot");
      if (rawPartner) {
        try {
          const profile = JSON.parse(rawPartner);
          setSavedPartnerProfile(profile);
        } catch {
          // ignore parse error
        }
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  const handleMessageListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      const isNearBottom = distanceToBottom <= 120;
      shouldAutoScrollRef.current = isNearBottom;
      setShowScrollToBottom(!isNearBottom);
    },
    [],
  );

  const getPartnerTypeForConversation = useCallback(
    (conversationId: string) => {
      const partnerId =
        conversationId.split("-").find((id) => id !== userType) ?? "";
      if (partnerId === "seller") return "seller";
      if (partnerId === "cs") return "cs";
      return "buyer";
    },
    [userType],
  );

  const partnerName = useMemo(() => {
    if (!selectedConversationId) return "";

    return (
      savedPartnerProfile?.name ??
      summaries.find((item) => item.conversationId === selectedConversationId)
        ?.partnerName ??
      getConversationTitle(selectedConversationId, userType)
    );
  }, [selectedConversationId, userType, savedPartnerProfile, summaries]);

  const partnerType = useMemo<UserType>(() => {
    if (!selectedConversationId) return "buyer";
    return getPartnerTypeForConversation(selectedConversationId);
  }, [selectedConversationId, getPartnerTypeForConversation]);

  const partnerAvatarClass =
    partnerType === "seller"
      ? "bg-sky-100 text-sky-700"
      : partnerType === "cs"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-slate-200 text-slate-700";

  

  const partnerStatus =
    statuses[selectedConversationId ?? ""] ??
    null;

  const statusLabel = selectedConversationId
    ? partnerStatus
      ? partnerStatus.online
        ? "Online"
        : partnerStatus.lastSeen
          ? `Last seen ${new Date(partnerStatus.lastSeen).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              },
            )}`
          : "Offline"
      : `${partnerType === "seller" ? "Seller" : partnerType === "cs" ? "Customer Service" : "Chat"} status tidak tersedia`
    : "";

  const handleOpenConversation = (
    conversationId: string,
    summary?: ConversationSummary,
  ) => {
    const partnerTypeForConversation =
      getPartnerTypeForConversation(conversationId);
    setSelectedConversationId(conversationId);
    selectedConversationIdRef.current = conversationId;

    if (summary) {
      setSavedPartnerProfile({
        id: summary.partnerId,
        name: summary.partnerName,
        image: summary.partnerImage,
        type: partnerTypeForConversation,
      });
    }

    clearConversationUnread(conversationId);
    markConversationRead(conversationId);

    window.sessionStorage.setItem("chatConversationId", conversationId);
    if (summary) {
      window.sessionStorage.setItem(
        "chatPartnerSnapshot",
        JSON.stringify({
          id: summary.partnerId,
          name: summary.partnerName,
          image: summary.partnerImage ?? "",
          type: partnerTypeForConversation,
        }),
      );
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !selectedConversationId) return;

    // Validate seller ID exists for buyer→seller messages
    if (partnerType === "seller" && !savedPartnerProfile?.id) {
      return;
    }

    const normalized = trimmed.replace(/[\s\-().]/g, "");
    if (/(?:\+?62|0)8\d{8,12}/.test(normalized)) {
      setText("");
      return;
    }

    const payload: SocketChatMessage = {
      conversationId: selectedConversationId,
      type: "text",
      text: trimmed,
      partner: savedPartnerProfile ? {
        id: savedPartnerProfile.id,
        name: savedPartnerProfile.name,
        image: savedPartnerProfile.image,
        type: savedPartnerProfile.type ?? partnerType,
      } : undefined,
    };

    send(payload);
    setText("");
  };

  const handleScrollToBottom = () => {
    const element = messageListRef.current;
    if (!element) return;

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setShowScrollToBottom(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-90 border-r border-gray-200 bg-white">
        <PageHeader title="Chat" />
        <ChatList
          loading={loading}
          summaries={summaries}
          selectedConversationId={selectedConversationId}
          onOpenConversation={handleOpenConversation}
          userType={userType}
        />
      </aside>
      <ChatPanel
        selectedConversationId={selectedConversationId}
        messages={messages}
        savedPartnerProfile={savedPartnerProfile}
        partnerAvatarClass={partnerAvatarClass}
        partnerName={partnerName}
        statusLabel={statusLabel}
        showScrollToBottom={showScrollToBottom}
        text={text}
        onTextChange={setText}
        handleSend={handleSend}
        handleScrollToBottom={handleScrollToBottom}
        onMessageListScroll={handleMessageListScroll}
        messageListRef={messageListRef}
        userId={userId}
        userType={userType}
        partnerType={partnerType}
      />
    </div>
  );
}
