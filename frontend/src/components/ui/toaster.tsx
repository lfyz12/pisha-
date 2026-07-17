import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToastStore } from "@/stores/use-toast-store";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <ToastViewport>
      {toasts.map((item) => (
        <Toast key={item.id} variant={item.variant}>
          <div className="grid gap-1">
            <ToastTitle>{item.title}</ToastTitle>
            {item.description && <ToastDescription>{item.description}</ToastDescription>}
          </div>
          <ToastClose onClick={() => dismiss(item.id)} />
        </Toast>
      ))}
    </ToastViewport>
  );
}
