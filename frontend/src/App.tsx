import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { RouterProvider } from "react-router";
import { router } from "@/routes";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/stores";

export default function App() {
  const rehydrate = useAuthStore((s) => s.rehydrate);

  useEffect(() => {
    void rehydrate();
  }, [rehydrate]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <Analytics />
    </>
  );
}
