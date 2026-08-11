import type {
  ConversationItem,
  MessageItem,
  UserType,
} from "@/features/chat/hooks/useSocketChat";

export const getPartnerName = (userType: UserType, partnerId: string) => {
  if (partnerId === "buyer") return "Buyer";
  if (partnerId === "seller") return "Seller";
  if (partnerId === "cs") return "Customer Service";

  return partnerId;
};

export const getConversationTitle = (
  conversationId: string,
  userType: UserType,
) => {
  const partnerId = conversationId.split("-").find((id) => id !== userType) ?? "";
  return getPartnerName(userType, partnerId);
};

export const formatTime = (time?: string) => {
  if (!time) return "";

  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatDateLabel = (time?: string) => {
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

export const getMessagePreview = (message?: MessageItem | null) => {
  if (!message) return "Mulai chat";

  if (typeof message.text === "string" && message.text.trim().length > 0) {
    return message.text;
  }

  if (message.type === "order") return "Pesanan";
  if (message.type === "product") return "Produk";

  return "Pesan baru";
};

export const canSeeConversation = (
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

export const getAvatarInitial = (name: string) => {
  const words = name.trim().split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
};
