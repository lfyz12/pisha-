import { useState, useMemo, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { RatingStudent } from "@/types";

interface StudentSelectProps {
  students: RatingStudent[];
  value: string | null;
  onChange: (studentId: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  showClear?: boolean;
}

export function StudentSelect({
  students,
  value,
  onChange,
  placeholder = "Выберите студента",
  searchPlaceholder = "Поиск студентов...",
  className,
  showClear = true,
}: StudentSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedStudent = value ? students.find((s) => s.id === value) : null;

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        String(s.course).includes(q)
    );
  }, [students, searchTerm]);

  return (
    <div className={cn("w-full", className)}>
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearchTerm("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 bg-surface-container-low border border-border-subtle rounded-lg px-3 focus:outline-none focus:border-primary transition-colors text-left",
              "min-h-[44px]",
              !selectedStudent && "text-secondary"
            )}
          >
            {selectedStudent ? (
              <>
                <div className="w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center text-[9px] font-bold shrink-0">
                  {selectedStudent.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-xs font-medium truncate text-text-main">
                    {selectedStudent.name}
                  </div>
                  <div className="text-[10px] text-secondary truncate">
                    {selectedStudent.group} • {selectedStudent.course} курс
                  </div>
                </div>
              </>
            ) : (
              <span className="text-xs text-secondary truncate flex-1">{placeholder}</span>
            )}
            <Icon name="expand_more" className="text-secondary text-lg shrink-0 ml-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-border-subtle">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-1.5">
              <Icon name="search" className="text-secondary text-sm shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-secondary/60"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-secondary hover:text-text-main"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {showClear && value && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-secondary hover:bg-surface-container-low transition-colors border-b border-border-subtle"
              >
                <Icon name="close" className="text-sm" />
                <span>Сбросить выбор</span>
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-secondary">
                Студенты не найдены
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low",
                    s.id === value ? "bg-primary-fixed/20" : ""
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold shrink-0">
                    {s.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-xs font-medium truncate text-text-main">{s.name}</div>
                    <div className="text-[10px] text-secondary truncate">
                      {s.group} • {s.course} курс
                    </div>
                  </div>
                  {s.id === value && (
                    <Icon name="check" className="text-primary text-sm shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
