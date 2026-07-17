import { useRef, useState } from "react";
import axios from "axios";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IngestionStatusBadge } from "@/components/ingestion-status-badge";
import {
  useCreateKBCategory,
  useDeleteKBCategory,
  useDeleteKBDocument,
  useKBCategories,
  useKBDocuments,
  useReingestKBDocument,
  useUpdateKBCategory,
  useUploadKBDocument,
} from "@/hooks";
import { toast } from "@/stores";
import { cn } from "@/lib/utils";
import type { GrantCategory } from "@/types";

const DOCUMENT_ACCEPT = ".pdf,.docx,.md,.txt";

interface CategoryFormState {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  id: null,
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

export function KnowledgeBaseSection() {
  const documentsQuery = useKBDocuments();
  const categoriesQuery = useKBCategories();
  const uploadDocument = useUploadKBDocument();
  const deleteDocument = useDeleteKBDocument();
  const reingestDocument = useReingestKBDocument();
  const createCategory = useCreateKBCategory();
  const updateCategory = useUpdateKBCategory();
  const deleteCategory = useDeleteKBCategory();

  const [sourceMode, setSourceMode] = useState<"file" | "url">("file");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(null);

  const documents = documentsQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const payload =
      sourceMode === "file"
        ? { file: selectedFile ?? undefined, title: title.trim() || undefined }
        : { sourceUrl: sourceUrl.trim(), title: title.trim() || undefined };

    if (sourceMode === "file" && !payload.file) return;
    if (sourceMode === "url" && !payload.sourceUrl) return;

    uploadDocument.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Документ загружен", description: "Идёт обработка и индексация" });
        setSelectedFile(null);
        setSourceUrl("");
        setTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (error) => {
        const message = axios.isAxiosError(error)
          ? ((error.response?.data as { message?: string } | undefined)?.message ??
            "Не удалось загрузить документ")
          : "Не удалось загрузить документ";
        toast({ title: message, variant: "destructive" });
      },
    });
  };

  const handleReingest = (id: string) => {
    reingestDocument.mutate(id, {
      onSuccess: () => toast({ title: "Повторная обработка запущена" }),
      onError: (error) => {
        const is409 = axios.isAxiosError(error) && error.response?.status === 409;
        toast({
          title: is409 ? "Документ уже обрабатывается" : "Не удалось запустить обработку",
          variant: "destructive",
        });
      },
    });
  };

  const handleDeleteDocument = () => {
    if (!documentToDelete) return;
    deleteDocument.mutate(documentToDelete, {
      onSuccess: () => toast({ title: "Документ удалён" }),
      onError: () => toast({ title: "Не удалось удалить документ", variant: "destructive" }),
    });
    setDocumentToDelete(null);
  };

  const openCategoryForm = (category?: GrantCategory) => {
    setCategoryForm(
      category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            isActive: category.isActive,
          }
        : { ...EMPTY_CATEGORY_FORM }
    );
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm) return;
    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim(),
      description: categoryForm.description.trim(),
      is_active: categoryForm.isActive,
    };
    if (!payload.name || !payload.slug) return;

    const onError = () =>
      toast({ title: "Не удалось сохранить категорию", variant: "destructive" });

    if (categoryForm.id) {
      updateCategory.mutate(
        { id: categoryForm.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Категория обновлена" });
            setCategoryForm(null);
          },
          onError,
        }
      );
    } else {
      createCategory.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Категория создана" });
          setCategoryForm(null);
        },
        onError,
      });
    }
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;
    deleteCategory.mutate(categoryToDelete, {
      onSuccess: () => toast({ title: "Категория удалена" }),
      onError: () => toast({ title: "Не удалось удалить категорию", variant: "destructive" }),
    });
    setCategoryToDelete(null);
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-headline font-bold text-text-main">База знаний</h2>
        <p className="text-sm text-secondary mt-1">
          Документы, которые ИИ-помощник использует для ответов студентам
        </p>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
            <Icon name="upload_file" className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-headline font-bold">Загрузить документ</h3>
            <p className="text-xs text-secondary">Файл (pdf, docx, md, txt, до 20 МБ) или ссылка</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-3">
          <div className="flex gap-2">
            {(
              [
                ["file", "Файл"],
                ["url", "Ссылка"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSourceMode(mode)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                  sourceMode === mode
                    ? "bg-primary text-on-primary border-primary"
                    : "text-secondary border-border-subtle hover:text-primary hover:border-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          {sourceMode === "file" ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-border-subtle rounded-lg px-4 py-3 text-sm text-secondary hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="attach_file" className="text-lg" />
              {selectedFile ? selectedFile.name : "Выбрать файл"}
            </button>
          ) : (
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/document"
              className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
            />
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название (необязательно)"
            className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
          />

          <button
            type="submit"
            disabled={
              uploadDocument.isPending ||
              (sourceMode === "file" ? !selectedFile : !sourceUrl.trim())
            }
            className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon
              name={uploadDocument.isPending ? "hourglass_empty" : "upload"}
              className="text-lg"
            />
            {uploadDocument.isPending ? "Загрузка..." : "Загрузить"}
          </button>
        </form>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
        <h3 className="text-sm font-headline font-bold">Документы</h3>
        {documents.length === 0 && !documentsQuery.isLoading ? (
          <p className="text-sm text-secondary">Документов пока нет</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Категории</TableHead>
                <TableHead className="text-right">Чанки</TableHead>
                <TableHead>Добавлен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="max-w-[16rem]">
                      <p className="font-semibold truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      {doc.status === "failed" && doc.error && (
                        <p className="text-[10px] text-status-error truncate" title={doc.error}>
                          {doc.error}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-secondary">
                      <Icon
                        name={doc.sourceType === "url" ? "link" : "description"}
                        className="text-base"
                      />
                      {doc.sourceType === "url" ? "URL" : "Файл"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <IngestionStatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[14rem]">
                      {doc.categories.length > 0 ? (
                        doc.categories.map((category) => (
                          <span
                            key={category.slug}
                            className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                          >
                            {category.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-secondary">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{doc.chunkCount}</TableCell>
                  <TableCell className="text-xs text-secondary">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleReingest(doc.id)}
                        disabled={
                          doc.status === "pending" ||
                          doc.status === "processing" ||
                          reingestDocument.isPending
                        }
                        className="p-1.5 text-secondary hover:text-primary transition-colors disabled:opacity-40"
                        title="Повторить обработку"
                      >
                        <Icon name="refresh" className="text-lg" />
                      </button>
                      <button
                        onClick={() => setDocumentToDelete(doc.id)}
                        className="p-1.5 text-secondary hover:text-status-error transition-colors"
                        title="Удалить документ"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-headline font-bold">Категории грантов</h3>
          <button
            onClick={() => openCategoryForm()}
            className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1"
          >
            <Icon name="add" className="text-base" />
            Создать
          </button>
        </div>
        {categories.length === 0 && !categoriesQuery.isLoading ? (
          <p className="text-sm text-secondary">Категорий пока нет</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-main truncate">{category.name}</p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        category.isActive
                          ? "bg-status-success/10 text-status-success"
                          : "bg-surface-container-high text-secondary"
                      )}
                    >
                      {category.isActive ? "Активна" : "Отключена"}
                    </span>
                  </div>
                  <p className="text-xs text-secondary truncate">
                    {category.slug}
                    {category.description && ` — ${category.description}`}
                  </p>
                </div>
                <button
                  onClick={() => openCategoryForm(category)}
                  className="p-1.5 text-secondary hover:text-primary transition-colors"
                  title="Редактировать категорию"
                >
                  <Icon name="edit" className="text-lg" />
                </button>
                <button
                  onClick={() => setCategoryToDelete(category.id)}
                  className="p-1.5 text-secondary hover:text-status-error transition-colors"
                  title="Удалить категорию"
                >
                  <Icon name="delete" className="text-lg" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(categoryForm)} onOpenChange={() => setCategoryForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryForm?.id ? "Редактировать категорию" : "Новая категория"}
            </DialogTitle>
            <DialogDescription>
              Категории используются для классификации документов и проектов.
            </DialogDescription>
          </DialogHeader>
          {categoryForm && (
            <form onSubmit={handleCategorySubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Название
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Slug
                </label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  required
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Описание
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                />
                Категория активна
              </label>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setCategoryForm(null)}
                  className="px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface-container rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createCategory.isPending || updateCategory.isPending}
                  className="px-5 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  Сохранить
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(documentToDelete)} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Документ и его фрагменты будут удалены из базы знаний без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(categoryToDelete)} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Категория будет удалена. Документы при этом сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
