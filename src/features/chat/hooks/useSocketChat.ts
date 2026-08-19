"use client"

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type UserType = "buyer" | "seller" | "cs";

export type ConversationItem = {
  id: string;
  participants: Array<string | { type?: string }>;
};

export type MessageItem = {
  senderId?: string;
  sender?: { type?: string; name?: string | null };
  senderType?: string;
  isRead?: boolean;
  text?: string;
  type?: string;
  createdAt?: string;
};

export type ConversationSummary = {
  conversationId: string;
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
};

export type ChatSocketMessage = {
  conversationId?: string;
  senderId?: string;
  text?: string | null;
  type?: string;
  createdAt?: string;
};

export type ChatAttachment = {
  name?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
};

export type ChatProductSnapshot = {
  productId?: string | number;
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  url?: string;
};

export type ChatOrderSnapshot = {
  orderId?: string | number;
  orderNumber?: string;
  status?: string;
  statusLabel?: string;
  total?: string;
  orderDate?: string;
  image?: string;
  title?: string;
  itemCount?: number;
};

export type ChatMessage = {
  _id?: string;
  sender?: { type?: string; name?: string | null };
  conversationId?: string;
  senderId?: string;
  senderType?: UserType | "cs" | string;
  type?: "text" | "image" | "file" | "product" | "order" | "system" | string;
  text?: string | null;
  attachment?: ChatAttachment | null;
  productId?: string | number;
  productSnapshot?: ChatProductSnapshot | null;
  orderSnapshot?: ChatOrderSnapshot | null;
  partner?: {
    id?: string | number | null;
    name?: string | null;
    image?: string | null;
    type?: string | null;
  } | null;
  isRead?: boolean;
  createdAt?: string;
};

export type UserStatus = {
  conversationId: string;
  online: boolean;
  lastSeen: string | null;
};

export default function useSocketChat({
  url,
  userId,
  userType,
  conversationId,
  onChatMessage,
}: {
  url: string;
  userId?: string;
  userType?: UserType;
  conversationId?: string;
  onChatMessage?: (message: ChatMessage) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const conversationIdRef = useRef<string | undefined>(conversationId);
  const joinedConversationIdsRef = useRef(new Set<string>());
  const pendingReadConversationIdsRef = useRef(new Set<string>());
  const onChatMessageRef = useRef(onChatMessage);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
  }, [onChatMessage]);

  useEffect(() => {
    if (!userId || !userType) return;

    const joinedConversationIds = joinedConversationIdsRef.current;

    const socket = io(url, {
      query: {
        userId,
        userType,
      },
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      joinedConversationIds.clear();
      const currentConversation = conversationIdRef.current;
      if (currentConversation) {
        joinConversation(currentConversation);
      }
      pendingReadConversationIdsRef.current.forEach((pendingConversationId) => {
        socket.emit("mark-conversation-read", {
          conversationId: pendingConversationId,
        });
      });
      pendingReadConversationIdsRef.current.clear();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = () => {
      setConnected(false);
    };

    const handleChatMessage = (message: ChatMessage) => {
      if (!message.conversationId) return;

      onChatMessageRef.current?.(message);

      setMessages((prev) => {
        const activeConversationId = conversationIdRef.current;
        if (message.conversationId !== activeConversationId) {
          return prev;
        }

        return [...prev, message];
      });
    };

    const handleMessagesRead = (payload: {
      conversationId: string;
      messageIds?: string[];
      readerId?: string;
    }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.conversationId === payload.conversationId &&
          (!payload.messageIds || payload.messageIds.includes(message._id as string))
            ? { ...message, isRead: true }
            : message,
        ),
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chatMessage", handleChatMessage);
    const handleConversationStatus = (status: UserStatus) => {
      setStatuses((prev) => ({ ...prev, [status.conversationId]: status }));
    };

    socket.on("conversationStatus", handleConversationStatus);
    socket.on("messagesRead", handleMessagesRead);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chatMessage", handleChatMessage);
      socket.off("conversationStatus", handleConversationStatus);
      socket.off("messagesRead", handleMessagesRead);
      socket.disconnect();
      socketRef.current = null;
      joinedConversationIds.clear();
    };
  }, [url, userId, userType]);

  function send(payload: ChatMessage) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("send-message", payload);
  }

  function joinConversation(id: string) {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !id) return;
    if (joinedConversationIdsRef.current.has(id)) return;
    joinedConversationIdsRef.current.add(id);
    socket.emit("join-conversation", { conversationId: id });
  }

  function markConversationRead(conversationId: string) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      pendingReadConversationIdsRef.current.add(conversationId);
      return;
    }
    socket.emit("mark-conversation-read", { conversationId });
  }

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;
    async function load() {
      try {
        const base = url.replace(/\/$/, "");
        const res = await fetch(`${base}/messages/${conversationId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setMessages(data || []);
      } catch {
        // ignore for demo
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [conversationId, url]);

  useEffect(() => {
    if (!connected || !conversationId) return;
    const socket = socketRef.current;
    if (!socket) return;

    joinedConversationIdsRef.current.forEach((joinedConversationId) => {
      if (joinedConversationId !== conversationId) {
        socket.emit("leave-conversation", { conversationId: joinedConversationId });
        joinedConversationIdsRef.current.delete(joinedConversationId);
      }
    });

    if (joinedConversationIdsRef.current.has(conversationId)) return;

    joinedConversationIdsRef.current.add(conversationId);
    socket.emit("join-conversation", { conversationId });
  }, [connected, conversationId]);

  function getSocket() {
    return socketRef.current;
  }

  function clearMessages() {
    setMessages([]);
  }

  return {
    getSocket,
    connected,
    messages,
    statuses,
    send,
    joinConversation,
    markConversationRead,
    clearMessages,
  };
}
