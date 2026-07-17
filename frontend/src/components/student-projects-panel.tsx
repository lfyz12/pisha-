import { useEffect, useMemo, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { IngestionStatusBadge } from "@/components/ingestion-status-badge";
import { useDeleteStudentProject, useStudentProjects, useUploadStudentProject } from "@/hooks";
import { extractApiError } from "@/lib/api-error";
import { toast } from "@/stores";

export const PROJECT_ACCEPT = ".md,.docx,.pdf,.pptx";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * «Мои проекты»: upload button + list with status badges and category chips.
 * Toasts when an uploaded project finishes processing (ready/failed).
 * Pass `enabled={false}` to pause fetching/polling while the panel is hidden.
 */
export function StudentProjectsPanel({ enabled = true }: { enabled?: boolean }) {
  const projectsQuery = useStudentProjects(1, enabled);
  const uploadProject = useUploadStudentProject();
  const deleteProject = useDeleteStudentProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownStatusesRef = useRef<Map<string, string>>(new Map());

  const projects = useMemo(() => projectsQuery.data?.data ?? [], [projectsQuery.data]);

  useEffect(() => {
    const known = knownStatusesRef.current;
    for (const project of projects) {
      const previous = known.get(project.id);
      if (previous && previous !== project.status) {
        if (project.status === "ready") {
          const categories = project.categories.map((c) => c.name).join(", ");
          toast({
            title: `Проект «${project.title}» обработан`,
            description: categories ? `Категории: ${categories}` : undefined,
          });
        } else if (project.status === "failed") {
          toast({
            title: `Не удалось обработать «${project.title}»`,
            description: project.error ?? undefined,
            variant: "destructive",
          });
        }
      }
      known.set(project.id, project.status);
    }
  }, [projects]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "Файл больше 20 МБ", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    uploadProject.mutate(
      { file },
      {
        onSuccess: () => {
          toast({ title: "Проект загружен", description: "Идёт обработка файла" });
        },
        onError: (error) => {
          toast({
            title: extractApiError(error, "Не удалось загрузить проект"),
            variant: "destructive",
          });
        },
      }
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(id, {
      onError: () => toast({ title: "Не удалось удалить проект", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={PROJECT_ACCEPT}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadProject.isPending}
        className="w-full border border-dashed border-border-subtle text-secondary text-xs font-semibold py-2 rounded-lg hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Icon name={uploadProject.isPending ? "hourglass_empty" : "upload"} className="text-base" />
        {uploadProject.isPending ? "Загрузка..." : "Загрузить проект"}
      </button>

      {projects.length === 0 && !projectsQuery.isLoading && (
        <p className="text-xs text-secondary text-center py-2">Нет загруженных проектов</p>
      )}

      <ul className="space-y-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-main truncate" title={project.title}>
                  {project.title}
                </p>
                <div className="mt-1">
                  <IngestionStatusBadge status={project.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(project.id)}
                disabled={deleteProject.isPending}
                className="text-secondary hover:text-status-error transition-colors shrink-0 disabled:opacity-50"
                title="Удалить проект"
              >
                <Icon name="delete" className="text-base" />
              </button>
            </div>
            {project.status === "failed" && project.error && (
              <p className="text-[10px] text-status-error mt-1" title={project.error}>
                {project.error}
              </p>
            )}
            {project.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {project.categories.map((category) => (
                  <span
                    key={category.slug}
                    className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
