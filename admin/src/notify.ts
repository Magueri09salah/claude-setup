import { notifications } from "@mantine/notifications";
import { ApiError } from "./api/client";

export function notifyError(e: unknown): void {
  notifications.show({
    color: "red",
    title: "خطأ",
    message: e instanceof ApiError ? e.message : "حدث خطأ غير متوقع",
  });
}

export function notifySuccess(title: string, message: string): void {
  notifications.show({ color: "green", title, message });
}
