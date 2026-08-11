"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import useSocketChat, {
  type ChatMessage as SocketChatMessage,
  type UserType,
} from "@/hooks/useSocketChat";
import ChatMessage from "@/components/common/ChatMessage";
import { useAutolarisProductDetail } from "@/features/product/hooks";

function formatDateLabel(date: string | Date) {
  const d = new Date(date);

  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDateKey(date: string | Date) {
  const d = new Date(date);

  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function LiveChatPage() {
  const router = useRouter();
  const defaultUrl =
    process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8000";
  const [url] = useState(defaultUrl);

  const ROLES = React.useMemo(
    () => [
      { id: "buyer", name: "Buyer" },
      { id: "seller", name: "Seller" },
      { id: "cs", name: "Customer Service" },
    ],
    [],
  );

  const CONVERSATIONS = React.useMemo(
    () => [
      { id: "buyer-seller", participants: ["buyer", "seller"] },
      { id: "buyer-cs", participants: ["buyer", "cs"] },
    ],
    [],
  );

  const [userType, setUserType] = useState<"buyer" | "seller" | "cs">("buyer");
  const [userId, setUserId] = useState<string>("buyer");

  const [conversationId, setConversationId] = useState("buyer-seller");
  const [sellerProfileOverride, setSellerProfileOverride] = useState<{
    name?: string;
    image?: string;
    id?: string;
  } | null>(null);
  const [initialProductSlug, setInitialProductSlug] = useState<string | undefined>(
    undefined,
  );
  const [initialOrderSnapshot, setInitialOrderSnapshot] = useState<{
    orderId?: string;
    orderNumber?: string;
    status?: string;
    statusLabel?: string;
    total?: string;
    orderDate?: string;
    title?: string;
    itemCount?: number;
    image?: string;
  } | undefined>(undefined);
  const [savedPartnerProfile, setSavedPartnerProfile] = useState<{
    id?: string;
    name?: string;
    image?: string;
    type?: UserType;
  } | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

    if (rawRole !== "seller" && rawRole !== "cs") {
      return;
    }

    const roleId = queryUserId ?? (rawRole === "seller" ? "seller" : "cs");
    const sellerName =
      params.get("sellerName") ??
      params.get("seller_name") ??
      (sellerRoleFlag ? "Seller" : params.get("seller")) ??
      params.get("name") ??
      "Seller";

    const sellerImage =
      params.get("sellerImage") ??
      params.get("seller_image") ??
      params.get("sellerAvatar") ??
      params.get("seller_avatar") ??
      params.get("image") ??
      "";

    const searchParams = new URLSearchParams({ role: rawRole });
    if (rawRole === "seller") {
      searchParams.set("sellerId", roleId);
    } else {
      searchParams.set("csId", roleId);
    }
    if (params.get("buyerId")) {
      searchParams.set("buyerId", params.get("buyerId")!);
    }

    const loadConversation = async () => {
      setSellerProfileOverride(
        rawRole === "seller"
          ? {
              id: roleId,
              name: sellerName,
              image: sellerImage || undefined,
            }
          : null,
      );
      setUserType(rawRole);
      setUserId(roleId);

      try {
        const response = await fetch(`${defaultUrl}/conversations?${searchParams}`);
        if (response.ok) {
          const conversations = (await response.json()) as Array<{
            conversationId?: string;
            partner?: { id?: string; name?: string; image?: string } | null;
          }>;
          const selectedConversation = conversations[0];
          if (selectedConversation?.conversationId) {
            setConversationId(selectedConversation.conversationId);
          } else {
            setConversationId(rawRole === "seller" ? "buyer-seller" : "buyer-cs");
          }
          if (selectedConversation?.partner) {
            setSavedPartnerProfile(selectedConversation.partner);
          }
        } else {
          setConversationId(rawRole === "seller" ? "buyer-seller" : "buyer-cs");
        }
      } catch {
        setConversationId(rawRole === "seller" ? "buyer-seller" : "buyer-cs");
      }
    };

    void loadConversation();
  }, [defaultUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const rawRole =
      params.get("role") ??
      params.get("userType") ??
      params.get("viewer") ??
      (params.get("seller") ? "seller" : null) ??
      (params.get("cs") ? "cs" : null);

    if (rawRole === "seller" || rawRole === "cs") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const storedSlug =
        window.sessionStorage.getItem("chatProductSlug") ?? undefined;
      const rawOrder = window.sessionStorage.getItem("chatOrderSnapshot");
      const storedConversation =
        window.sessionStorage.getItem("chatConversationId") || "buyer-seller";
      const rawPartner = window.sessionStorage.getItem("chatPartnerSnapshot");

      setInitialProductSlug(storedSlug);

      if (rawOrder) {
        try {
          setInitialOrderSnapshot(JSON.parse(rawOrder));
        } catch {
          setInitialOrderSnapshot(undefined);
        }
      }

      setConversationId(storedConversation);

      if (rawPartner) {
        try {
          const profile = JSON.parse(rawPartner) as {
            id?: string;
            name?: string;
            image?: string;
            type?: UserType;
          };
          setSavedPartnerProfile(profile);
        } catch {
          setSavedPartnerProfile(null);
        }
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const defaultTargetName = useMemo(() => {
    const conversation = CONVERSATIONS.find((c) => c.id === conversationId);
    const partnerId = conversation?.participants.find((p) => p !== userType);

    return ROLES.find((r) => r.id === partnerId)?.name ?? "Chat";
  }, [conversationId, userType, CONVERSATIONS, ROLES]);

  const partnerType = useMemo<UserType>(() => {
    const conversation = CONVERSATIONS.find((c) => c.id === conversationId);
    return (
      (conversation?.participants.find((p) => p !== userType) as UserType) ||
      "buyer"
    );
  }, [conversationId, userType, CONVERSATIONS]);

  const partnerAvatarLabel =
    partnerType === "seller" ? "S" : partnerType === "cs" ? "CS" : "B";
  const partnerAvatarClass =
    partnerType === "seller"
      ? "bg-sky-100 text-sky-700"
      : partnerType === "cs"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-200 text-slate-700";

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef(true);

  const { connected, messages, send, statuses, markConversationRead } = useSocketChat({
    url,
    userId,
    userType,
    conversationId: conversationId || undefined,
  });

  const productQuery = useAutolarisProductDetail(initialProductSlug, {
    enabled: Boolean(initialProductSlug),
  });

  const partnerOutlet = useMemo(() => {
    if (!productQuery.data) return null;
    return {
      id: productQuery.data.outletId,
      name: productQuery.data.outlet,
      image: productQuery.data.outletImage,
    };
  }, [productQuery.data]);

  const targetName = useMemo(() => {
    if (userType === "seller" || userType === "cs") {
      return "Buyer";
    }

    return (
      sellerProfileOverride?.name ??
      savedPartnerProfile?.name ??
      partnerOutlet?.name ??
      defaultTargetName
    );
  }, [
    userType,
    sellerProfileOverride,
    savedPartnerProfile,
    partnerOutlet,
    defaultTargetName,
  ]);

  const targetPartnerId =
    sellerProfileOverride?.id ?? savedPartnerProfile?.id ?? partnerOutlet?.id;

  useEffect(() => {
    if (!productQuery.data || !initialProductSlug) return;

    if (typeof window !== "undefined") {
      if (!window.sessionStorage.getItem("chatConversationId")) {
        window.sessionStorage.setItem("chatConversationId", "buyer-seller");
      }

      const partnerSnapshot = {
        id: String(productQuery.data.outletId ?? productQuery.data.id ?? "seller"),
        name: productQuery.data.outlet ?? productQuery.data.name ?? "Seller",
        image: productQuery.data.outletImage ?? productQuery.data.image ?? "",
        type: "seller" as UserType,
      };

      window.sessionStorage.setItem(
        "chatPartnerSnapshot",
        JSON.stringify(partnerSnapshot),
      );
    }
  }, [productQuery.data, initialProductSlug]);

  useEffect(() => {
    if (!productQuery.data) return;
    if (!userId) return;
    if (userType !== "buyer") return;

    const payload = {
      conversationId: "buyer-seller",
      buyerPhone: userId,
      buyerName: "Buyer",
      partner: {
        type: "seller",
        id: productQuery.data.outletId ?? productQuery.data.id,
        name: productQuery.data.outlet ?? productQuery.data.name,
        image: productQuery.data.outletImage ?? productQuery.data.image,
      },
    };

    fetch(`${url}/conversations/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Failed to create conversation on server:", err);
    });
  }, [productQuery.data, userId, userType, url]);

  const hasSentProductMessageRef = useRef(false);
  const hasSentOrderMessageRef = useRef(false);

  useEffect(() => {
    if (
      hasSentOrderMessageRef.current ||
      !connected ||
      !initialOrderSnapshot ||
      !conversationId ||
      !userId ||
      !userType
    ) {
      return;
    }

    const payload: SocketChatMessage = {
      conversationId,
      senderId: userId,
      senderType: userType,
      type: "order",
      productId: initialOrderSnapshot.orderId,
      orderSnapshot: {
        orderId: initialOrderSnapshot.orderId,
        orderNumber: initialOrderSnapshot.orderNumber,
        status: initialOrderSnapshot.status,
        statusLabel: initialOrderSnapshot.statusLabel,
        total: initialOrderSnapshot.total,
        orderDate: initialOrderSnapshot.orderDate,
        title: initialOrderSnapshot.title,
        itemCount: initialOrderSnapshot.itemCount,
        image: initialOrderSnapshot.image,
      },
    };

    send(payload);
    hasSentOrderMessageRef.current = true;
    window.sessionStorage.removeItem("chatOrderSnapshot");
  }, [
    connected,
    conversationId,
    userId,
    userType,
    initialOrderSnapshot,
    send,
  ]);

  useEffect(() => {
    if (
      hasSentProductMessageRef.current ||
      !connected ||
      !productQuery.data ||
      !initialProductSlug ||
      !conversationId ||
      !userId ||
      !userType
    ) {
      return;
    }

    const payload: SocketChatMessage = {
      conversationId,
      senderId: userId,
      senderType: userType,
      type: "product",
      productId: initialProductSlug,
      productSnapshot: {
        productId: productQuery.data.id,
        slug: productQuery.data.slug,
        name: productQuery.data.name,
        price: productQuery.data.price,
        image: productQuery.data.images?.[0]?.url ?? productQuery.data.image,
      },
    };

    send(payload);
    hasSentProductMessageRef.current = true;
    window.sessionStorage.removeItem("chatProductSlug");
  }, [
    connected,
    productQuery.data,
    initialProductSlug,
    conversationId,
    userId,
    userType,
    send,
  ]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    markConversationRead(conversationId, userId);
  }, [conversationId, userId, markConversationRead]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const element = messageListRef.current;
    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior,
    });
  }

  function handleScrollToBottom() {
    shouldAutoScrollRef.current = true;
    scrollToBottom("smooth");
    setShowScrollToBottom(false);
  }

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
    const element = messageListRef.current;
    if (!element) return;

    if (shouldAutoScrollRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  const partnerStatus =
    statuses[targetPartnerId ?? partnerType] ??
    statuses[partnerType] ??
    statuses["seller"] ??
    statuses["cs"] ??
    null;

  const statusLabel = partnerStatus
    ? partnerStatus.online
      ? "Online"
      : partnerStatus.lastSeen
      ? `Last seen ${new Date(partnerStatus.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`
      : "Offline"
    : `${partnerType === "seller" ? "Seller" : partnerType === "cs" ? "Customer Service" : "Chat"} status tidak tersedia`;

  function containsPhoneNumber(value: string) {
    const normalized = value.replace(/[\s\-().]/g, "");

    return /(?:\+?62|0)8\d{8,12}/.test(normalized);
  }

  function handleSend() {
    const message = text.trim();

    if (!message) return;

    if (containsPhoneNumber(message)) {
      setText("");
      return;
    }

    const payload: SocketChatMessage = {
      conversationId: conversationId || undefined,
      senderId: userId,
      senderType: userType,
      type: "text",
      text: message,
    };

    if (productQuery.data) {
      payload.productId = initialProductSlug;
      payload.productSnapshot = {
        productId: productQuery.data.id,
        slug: productQuery.data.slug,
        name: productQuery.data.name,
        price: productQuery.data.price,
        image: productQuery.data.images?.[0]?.url ?? productQuery.data.image,
      };
    }

    send(payload);
    setText("");
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <PageHeader
        onBack={() => router.replace("/chat")}
        title={targetName}
        titleContent={
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ${partnerAvatarClass} text-sm font-bold shadow-sm`}
            >
              {userType === "seller" || userType === "cs" ? (
                <span className="text-xs font-semibold uppercase tracking-wide">
                  B
                </span>
              ) : sellerProfileOverride?.image ? (
                <Image
                  src={sellerProfileOverride.image}
                  alt={sellerProfileOverride.name || "Seller"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : savedPartnerProfile?.image ? (
                <Image
                  src={savedPartnerProfile.image}
                  alt={savedPartnerProfile.name || "Seller"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : partnerOutlet?.image ? (
                <Image
                  src={partnerOutlet.image}
                  alt={partnerOutlet.name || "Outlet"}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                partnerAvatarLabel
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-gray-900">{targetName}</span>
              <span className="text-xs text-gray-500">{statusLabel}</span>
            </div>
          </div>
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden bg-slate-100">
        <div ref={messageListRef} className="relative min-h-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-4 pb-32">
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-slate-50 px-4 py-10 text-center text-sm text-gray-500">
                Belum ada pesan. Kirim pesan pertama untuk memulai.
              </div>
            ) : (
              messages.map((message, idx) => {
                const previous = messages[idx - 1];

                const currentDate = message.createdAt
                  ? getDateKey(message.createdAt)
                  : "";
                const previousDate = previous?.createdAt
                  ? getDateKey(previous.createdAt)
                  : "";
                const showDateHeader =
                  idx === 0 || currentDate !== previousDate;

                return (
                  <React.Fragment key={message._id ?? idx}>
                    {showDateHeader && (
                      <div className="my-4 flex justify-center">
                        <div className="rounded-xl bg-white px-4 py-1 text-xs text-gray-500 shadow-sm">
                          {message.createdAt
                            ? formatDateLabel(message.createdAt)
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
              })
            )}
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-28 right-6 z-50 transition-all duration-300 ease-out ${
          showScrollToBottom
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-90 opacity-0"
        }`}
      >
        <Button
          type="primary"
          shape="circle"
          onClick={handleScrollToBottom}
          className="flex h-11 w-11 items-center justify-center p-0 shadow-lg"
          icon={<DownOutlined />}
        />
      </div>

      <BottomActionBar>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 shadow-sm">
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={(e) => {
              if (e.shiftKey) return;

              e.preventDefault();
              handleSend();
            }}
            placeholder="Tulis pesan..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1 bg-transparent text-black placeholder:text-slate-400"
            variant="borderless"
            style={{
              resize: "none",
              minHeight: 44,
            }}
          />

          <Button
            type="primary"
            onClick={handleSend}
            className="rounded-full px-5 py-2"
          >
            Kirim
          </Button>
        </div>
      </BottomActionBar>
    </div>
  );
}
