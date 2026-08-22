"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-admin-heading/25 backdrop-blur-[1px]"
        onClick={onCancel}
      />
      <div className="relative bg-admin-surface border border-admin-line rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-admin-heading">{title}</h3>
        <p className="mt-2 text-sm text-admin-muted">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-admin-body bg-admin-surface border border-admin-line-strong rounded-lg hover:bg-admin-hover disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
              variant === "danger"
                ? "bg-admin-danger hover:bg-admin-danger/90"
                : "bg-admin-primary hover:bg-admin-primary-hover"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
