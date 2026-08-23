import { Plus } from "lucide-react";
import { Button, ButtonLink } from "./Button";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-admin-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-admin-heading">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-admin-muted">{description}</p>
        )}
      </div>
      {action?.href && (
        <ButtonLink
          href={action.href}
          className="shrink-0"
          icon={<Plus aria-hidden="true" className="size-4" />}
        >
          {action.label}
        </ButtonLink>
      )}
      {action?.onClick && !action.href && (
        <Button
          onClick={action.onClick}
          className="shrink-0"
          icon={<Plus aria-hidden="true" className="size-4" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
