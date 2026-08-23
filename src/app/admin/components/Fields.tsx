import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Surface } from "./Surface";

export const controlClassName =
  "w-full rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-sm text-admin-heading shadow-sm outline-none transition focus:border-admin-primary focus:ring-2 focus:ring-admin-focus/50 disabled:cursor-not-allowed disabled:bg-admin-subtle disabled:opacity-70";

const fieldClassName = `mt-1.5 ${controlClassName}`;

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldShellProps) {
  const supportId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-admin-body">
        {label}
        {required && <span className="ml-1 text-admin-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={supportId}
          role={error ? "alert" : undefined}
          className={`mt-1.5 text-xs ${error ? "text-admin-danger" : "text-admin-muted"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  id,
  label,
  hint,
  error,
  className = "",
  required,
  ...props
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${fieldClassName} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  className = "",
  required,
  ...props
}: TextAreaFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${fieldClassName} min-h-24 resize-y ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className = "",
  required,
  children,
  ...props
}: SelectFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${fieldClassName} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface CheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  hint?: string;
}

export function CheckboxField({
  id,
  label,
  hint,
  className = "",
  ...props
}: CheckboxFieldProps) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-4 shrink-0 rounded border-admin-line-strong text-admin-primary accent-admin-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-admin-body">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-admin-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  columns = 2,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  columns?: 1 | 2;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={className}>
      <fieldset>
        <legend className="text-base font-semibold text-admin-heading">{title}</legend>
        {description && <p className="mt-1 text-sm text-admin-muted">{description}</p>}
        <div
          className={`mt-5 grid gap-5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}
        >
          {children}
        </div>
      </fieldset>
    </Surface>
  );
}
