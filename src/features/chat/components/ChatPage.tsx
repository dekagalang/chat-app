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

export default function ChatPage() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const [userType, setUserType] = useState<UserType>("buyer");
  const [userId, setUserId] = useState<string>("buyer");
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
      currentUserId: string,
    ) => {
      const conversationId =
        conversation.threadId ?? conversation.id ?? conversation.conversationId ?? "";
      const participants = Array.isArray(conversation.participants)
        ? conversation.participants
        : (DEFAULT_CONVERSATIONS.find((c) => c.id === conversationId)
            ?.participants ?? []);

      const fallbackPartnerId =
        participants.find((id) => id !== currentUserId && id !== userType) ??
        participants.find((id) => id !== currentUserId) ??
        "";

      const partnerId =
        conversation.partner?.id &&
        String(conversation.partner.id) !== currentUserId
          ? String(conversation.partner.id)
          : fallbackPartnerId;

      const partnerName =
        conversation.partner?.name &&
        partnerId === String(conversation.partner.id)
          ? conversation.partner.name
          : getConversationTitle(conversationId, userType);

      const partnerImage = conversation.partner?.image ?? "";

      return { partnerId, partnerName, partnerImage };
    },
    [userType],
  );

  const handleChatMessage = useCallback(
    (message: SocketChatMessage) => {
      if (!message.conversationId) return;

      const conversationId = message.conversationId;
      const lastMessageAt = message.createdAt || new Date().toISOString();
      const preview = getMessagePreview(message as MessageItem);
      const isIncoming = message.senderId !== userId;

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
            partnerName: getConversationTitle(conversationId, userType),
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
    userId,
    userType,
    conversationId: selectedConversationId ?? undefined,
    joinConversationIds: summaries.map((item) => item.conversationId),
    onChatMessage: handleChatMessage,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("chatUserType", userType);
    window.sessionStorage.setItem("chatUserId", userId);
  }, [userType, userId]);

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

        return;
      }

      if (storedUserType) setUserType(storedUserType);
      if (storedUserId) setUserId(storedUserId);
      setSelectedConversationId(null);
    };

    Promise.resolve().then(applyStoredState);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      setLoading(true);

      try {
        const query = new URLSearchParams();

        if (userType === "seller") {
          query.set("role", "seller");
        } else if (userType === "cs") {
          query.set("role", "cs");
        }

        if (userId && userType !== "buyer") {
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
                if (message.senderId !== userId && !message.isRead) {
                  return count + 1;
                }
                return count;
              }, 0);

              const { partnerId, partnerName, partnerImage } =
                resolvePartnerFromConversation(conversation, userId);

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
              const { partnerId, partnerName, partnerImage } =
                resolvePartnerFromConversation(conversation, userId);

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

        if (!active) return;

        const sortedDetails = details.sort((a, b) => {
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
        if (active) setLoading(false);
      }
    }

    loadConversations();

    return () => {
      active = false;
    };
  }, [userType, userId, resolvePartnerFromConversation]);

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
    if (!selectedConversationId || !userId) return;

    markConversationRead(selectedConversationId, userId);
  }, [selectedConversationId, userId, markConversationRead]);

  useEffect(() => {
    const element = messageListRef.current;
    if (!element) return;

    const handleScroll = () => {
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      const isNearBottom = distanceToBottom <= 120;
      shouldAutoScrollRef.current = isNearBottom;
      setShowScrollToBottom(!isNearBottom);
    };

    element.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    const element = messageListRef.current;
    if (!element) return;
    if (shouldAutoScrollRef.current) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
  }, [messages, selectedConversationId]);

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
    statuses[savedPartnerProfile?.id ?? ""] ??
    statuses[partnerType] ??
    statuses["seller"] ??
    statuses["cs"] ??
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
    markConversationRead(conversationId, userId);

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

    const payload: SocketChatMessage = {
      conversationId: selectedConversationId,
      senderId: userId,
      senderType: userType,
      type: "text",
      text: trimmed,
    };

    send(payload);
    markConversationRead(selectedConversationId, userId);
    clearConversationUnread(selectedConversationId);
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
        messageListRef={messageListRef}
        userId={userId}
        userType={userType}
        partnerType={partnerType}
      />
    </div>
  );
}
