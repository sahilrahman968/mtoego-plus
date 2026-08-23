import { Inbox, Plus } from "lucide-react";
import { Button, ButtonLink } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-admin-line bg-admin-subtle text-admin-muted">
        {icon || (
          <Inbox aria-hidden="true" className="size-5" strokeWidth={1.75} />
        )}
      </div>
      <h3 className="text-base font-semibold text-admin-heading">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-admin-muted">{description}</p>
      {action?.href && (
        <ButtonLink
          href={action.href}
          className="mt-5"
          icon={<Plus aria-hidden="true" className="size-4" />}
        >
          {action.label}
        </ButtonLink>
      )}
      {action?.onClick && !action.href && (
        <Button
          onClick={action.onClick}
          className="mt-5"
          icon={<Plus aria-hidden="true" className="size-4" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
