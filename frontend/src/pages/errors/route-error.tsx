import { Button } from "@/components/ui/button";

export default function RouteErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">Ошибка</h1>
        <p className="mt-2 text-xl text-muted-foreground">Не удалось загрузить страницу</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Попробуйте обновить страницу — обычно это помогает.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Обновить
        </Button>
      </div>
    </div>
  );
}
