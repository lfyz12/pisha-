import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableSkeleton } from "./data-table-skeleton";
import { DataTableEmpty } from "./data-table-empty";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalItems?: number;
  isLoading?: boolean;
  searchPlaceholder?: string;
  enableServerPagination?: boolean;
  manualPagination?: boolean;
  pageCount?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnFiltersChange?: (columnFilters: ColumnFiltersState) => void;
  onSearchChange?: (search: string) => void;
  pagination?: PaginationState;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  rowSelection?: RowSelectionState;
  renderToolbar?: React.ComponentType<{ table: ReturnType<typeof useReactTable<TData>> }>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  totalItems,
  isLoading = false,
  searchPlaceholder = "Search...",
  enableServerPagination = false,
  manualPagination = false,
  pageCount,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  onSearchChange,
  pagination: controlledPagination,
  sorting: controlledSorting,
  columnFilters: controlledColumnFilters,
  enableRowSelection = false,
  onRowSelectionChange,
  rowSelection: controlledRowSelection,
  renderToolbar: CustomToolbar,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>(
    {}
  );
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const sorting = controlledSorting ?? internalSorting;
  const columnFilters = controlledColumnFilters ?? internalColumnFilters;
  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const pagination = controlledPagination ?? internalPagination;

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setInternalSorting(newSorting);
      onSortingChange?.(newSorting);
    },
    [sorting, onSortingChange]
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const newFilters = typeof updater === "function" ? updater(columnFilters) : updater;
      setInternalColumnFilters(newFilters);
      onColumnFiltersChange?.(newFilters);
    },
    [columnFilters, onColumnFiltersChange]
  );

  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === "function" ? updater(pagination) : updater;
      setInternalPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    [pagination, onPaginationChange]
  );

  const handleRowSelectionChange = React.useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      setInternalRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    [rowSelection, onRowSelectionChange]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    pageCount: enableServerPagination ? pageCount : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility: internalColumnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setInternalColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableServerPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: enableServerPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: enableServerPagination ? undefined : getSortedRowModel(),
    manualPagination: enableServerPagination || manualPagination,
  });

  if (isLoading) {
    return <DataTableSkeleton columnCount={columns.length} rowCount={5} />;
  }

  if (data.length === 0) {
    return <DataTableEmpty />;
  }

  return (
    <div className="space-y-4">
      {CustomToolbar ? (
        <CustomToolbar table={table} />
      ) : (
        <DataTableToolbar
          table={table}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalItems={totalItems} />
    </div>
  );
}
