"use client";

import React from "react";
import { Button as AntButton } from "antd";
import type { ButtonProps as AntButtonProps } from "antd";

type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export type ButtonProps = AntButtonProps & {
  unstyled?: boolean;
};

export function Button({
  unstyled = false,
  type,
  style,
  htmlType,
  ...props
}: ButtonProps) {
  if (unstyled) {
    const nativeProps = props as NativeButtonProps;

    return (
      <button type={htmlType ?? "button"} {...nativeProps}>
        {nativeProps.children}
      </button>
    );
  }

  const primaryStyle =
    type === "primary" && !props.danger && !props.disabled
      ? { background: "#2563eb", ...style }
      : style;

  return (
    <AntButton
      type={type}
      htmlType={htmlType}
      style={primaryStyle}
      {...props}
    />
  );
}
