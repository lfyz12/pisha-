export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">403</h1>
        <p className="mt-2 text-xl text-muted-foreground">Forbidden</p>
        <p className="mt-4 text-sm text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  );
}
