import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";

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

interface ArchiveConfirmDialogProps {
  /** The record's own display name — the dialog names what it archives. */
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

/**
 * One confirmation for every structure resource, worded as archival and never
 * deletion: the body says history survives and restoring exists, which is the
 * truth the word "delete" would contradict. Restore itself asks nothing — it
 * is safe, and confirming a safe action teaches people to click through the
 * unsafe one.
 *
 * The confirm button keeps the default variant rather than destructive red:
 * archiving is reversible tidying, and painting it as destruction would make
 * the dialog argue with its own copy.
 */
export function ArchiveConfirmDialog({
  name,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ArchiveConfirmDialogProps) {
  const { t } = useTranslation("app");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("structure.archiveDialog.title", { name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("structure.archiveDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("structure.archiveDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Kept open while the mutation runs; the caller closes it on
              // settle so a failure can leave the page's error toast visible
              // with the dialog gone rather than frozen.
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <IconLoader2 className="animate-spin" aria-hidden />}
            {t("structure.archiveDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
