import type { KeyboardEvent } from "react";

/**
 * textarea 에서 Enter = 저장, Shift+Enter = 줄바꿈.
 * 한글 조합 중의 Enter 는 조합 확정이므로 저장으로 처리하지 않는다.
 */
export function submitOnEnter<T extends HTMLElement>(save: () => void) {
  return (e: KeyboardEvent<T>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const native = e.nativeEvent as unknown as {
      isComposing?: boolean;
      keyCode?: number;
    };
    if (native.isComposing || native.keyCode === 229) return;
    e.preventDefault();
    save();
  };
}

/** 입력창 아래에 붙이는 안내 문구 */
export const ENTER_HINT = "Enter 저장 · Shift+Enter 줄바꿈";
