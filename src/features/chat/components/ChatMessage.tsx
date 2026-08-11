"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { message as antdMessage } from "antd";
import { Check, CheckCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import { formatOrderDate, formatOrderStatus } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, UserType } from "@/features/chat/hooks/useSocketChat";

export default function ChatMessage({
  message,
  currentUserId,
  currentUserType,
  partnerType,
}: {
  message: ChatMessageType;
  currentUserId?: string;
  currentUserType?: UserType;
  partnerType?: UserType;
}) {
  const router = useRouter();

  const {
    senderId,
    type,
    text,
    createdAt,
    isRead,
    productId,
    productSnapshot,
    orderSnapshot,
  } = message;

  const isMe = senderId === currentUserId;
  const messageStatus = isMe ? (isRead ? "read" : "sent") : undefined;

  const rawProductId = productId ?? productSnapshot?.productId;

  const productPreview = useMemo(() => {
    return {
      image: productSnapshot?.image || "",
      name: productSnapshot?.name || "",
      price: productSnapshot?.price || "",
      slug: productSnapshot?.slug,
      id: productSnapshot?.productId ?? rawProductId,
    };
  }, [productSnapshot, rawProductId]);

  const orderPreview = orderSnapshot
    ? {
        image: orderSnapshot.image || "",
        title: orderSnapshot.title || "Detail Pesanan",
        itemCount: orderSnapshot.itemCount ?? 0,
        total: orderSnapshot.total || "",
        statusLabel: formatOrderStatus(
          orderSnapshot.statusLabel || orderSnapshot.status || "",
        ),
        orderNumber: orderSnapshot.orderNumber || String(orderSnapshot.orderId || ""),
        orderDate: orderSnapshot.orderDate || "",
      }
    : null;

  const showProductPreview = Boolean(
    type === "product" &&
      (productPreview.name || productPreview.image || productPreview.price),
  );

  const showOrderPreview = Boolean(type === "order" && orderPreview);
  const isBuyer = currentUserType === "buyer";
  const hideReceipts = isBuyer && partnerType === "cs";

  const handleViewProduct = () => {
    if (!productPreview.slug && !productPreview.id) return;

    const productPath = `/products/${productPreview.slug || productPreview.id}`;
    router.push(productPath);
  };

  const handleViewOrder = () => {
    if (!orderSnapshot) return;

    const orderSlug =
      orderSnapshot.orderId || orderSnapshot.orderNumber || orderSnapshot.orderDate || "";

    if (!orderSlug) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("fromChatOrderDetail", "1");
    }

    router.push(`/orders/${orderSlug}`);
  };

  const handleCopyOrderNumber = async () => {
    const orderNumber = orderSnapshot?.orderNumber || String(orderSnapshot?.orderId || "");

    if (!orderNumber) return;

    try {
      await navigator.clipboard.writeText(orderNumber);
      antdMessage.success("Nomor pesanan disalin");
    } catch {
      antdMessage.error("Gagal menyalin nomor pesanan");
    }
  };

  const handleCopyProductId = async () => {
    const productIdToCopy = String(productPreview.id ?? "");

    if (!productIdToCopy) return;

    try {
      await navigator.clipboard.writeText(productIdToCopy);
      antdMessage.success("ID produk disalin");
    } catch {
      antdMessage.error("Gagal menyalin ID produk");
    }
  };

  return (
    <div className={`flex px-3 ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] flex-col ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`inline-block max-w-full overflow-hidden rounded-2xl shadow-sm ${
            isMe ? "bg-[#DCF8C6] rounded-tr-md" : "bg-white rounded-tl-md"
          }`}
        >
          {type === "text" && (
            <p className="whitespace-pre-wrap px-4 py-2 text-sm text-gray-900">
              {text}
            </p>
          )}

          {showProductPreview && (
            <div className="w-65 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="relative h-45 w-full bg-gray-100">
                {productPreview.image ? (
                  <Image
                    src={productPreview.image}
                    alt={productPreview.name || "Produk"}
                    fill
                    sizes="260px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Tidak ada gambar
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="line-clamp-2 text-[15px] leading-5 text-gray-900">
                  {productPreview.name || "Produk"}
                </p>

                {productPreview.price ? (
                  <p className="mt-2 text-lg font-semibold text-[#f15a29]">
                    {formatCurrency(productPreview.price)}
                  </p>
                ) : null}

                {currentUserType !== "buyer" && type === "product" ? (
                  <div className="mt-3 flex items-center justify-center gap-2 border-t border-gray-200 pt-3">
                    <span className="text-[14px] font-medium text-gray-800">
                      {productPreview.id}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyProductId}
                      className="shrink-0 text-[#6b9ed8] transition-colors hover:text-[#4285c5]"
                      aria-label="Salin ID produk"
                    >
                      <Copy size={17} strokeWidth={1.8} />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="primary"
                    onClick={handleViewProduct}
                    className="mt-3 h-10 w-full rounded-lg bg-[#f15a29] text-white hover:bg-[#e04b1c]"
                  >
                    Lihat Produk
                  </Button>
                )}
              </div>
            </div>
          )}

          {showOrderPreview && orderPreview && (
            <div
              className={`w-90 max-w-full bg-[#f7f7f7] ${
                isBuyer ? "cursor-pointer" : ""
              }`}
              onClick={isBuyer ? handleViewOrder : undefined}
              role={isBuyer ? "button" : undefined}
              tabIndex={isBuyer ? 0 : undefined}
              onKeyDown={
                isBuyer
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleViewOrder();
                      }
                    }
                  : undefined
              }
            >
              <div className="flex gap-3 p-3">
                <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                  {orderPreview.image ? (
                    <Image
                      src={orderPreview.image}
                      alt={orderPreview.title}
                      fill
                      sizes="88px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Tidak ada gambar
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 text-[14px] font-medium leading-5 text-gray-800">
                    {orderPreview.title}
                  </p>

                  <p className="mt-2 text-[13px] text-gray-500">
                    {orderPreview.itemCount} item, Total: <span className="font-medium text-gray-700">{orderPreview.total}</span>
                  </p>

                  {orderPreview.statusLabel ? (
                    <p className="mt-2 text-[15px] font-medium text-[#f15a29]">
                      {orderPreview.statusLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-gray-200 bg-white px-3 py-3">
                {orderPreview.orderNumber ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-[13px] text-gray-500">
                      No. Pesanan
                    </span>

                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-gray-800">
                        {orderPreview.orderNumber}
                      </span>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopyOrderNumber();
                        }}
                        className="shrink-0 text-[#6b9ed8] transition-colors hover:text-[#4285c5]"
                        aria-label="Salin nomor pesanan"
                      >
                        <Copy size={17} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {orderPreview.orderDate ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="shrink-0 text-[13px] text-gray-500">
                      Waktu Pemesanan
                    </span>

                    <span className="text-right text-[14px] text-gray-700">
                      {formatOrderDate(orderPreview.orderDate)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div
          className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-gray-500`}
        >
          {createdAt
            ? new Date(createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : ""}

          {messageStatus === "sent" && !hideReceipts && (
            <Check size={14} className="text-gray-400" />
          )}

          {messageStatus === "read" && !hideReceipts && (
            <CheckCheck size={14} className="text-sky-500" />
          )}
        </div>
      </div>
    </div>
  );
}
