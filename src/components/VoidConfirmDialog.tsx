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

interface VoidConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  /** A transfer is voided as a pair, so its dialog cannot say "this row". */
  isTransferLeg?: boolean;
  /**
   * A rejection the user can act on — `movement_lot_in_use` names the exits
   * to void first. Rendered here rather than as a toast, because the dialog is
   * where the next attempt happens.
   */
  problem?: string | null;
}

/**
 * Voiding's confirmation, worded as voiding.
 *
 * A sibling of `ArchiveConfirmDialog` and, like it, never the word "delete":
 * the body states what actually happens — the row stops counting toward every
 * figure while the record itself is kept and stays readable. That is the truth
 * "delete" would contradict, and the reason the confirm button keeps the
 * default variant instead of destructive red. Voiding is a recorded
 * correction; painting it as destruction would make the dialog argue with the
 * sentence inside it.
 */
export function VoidConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  isTransferLeg = false,
  problem = null,
}: VoidConfirmDialogProps) {
  const { t } = useTranslation("app");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("ledger.void.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {isTransferLeg
              ? t("ledger.void.transferDescription")
              : t("ledger.void.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("ledger.void.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Kept open while the mutation runs: a refusal this dialog can
              // explain has to arrive somewhere the user is still looking.
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <IconLoader2 className="animate-spin" aria-hidden />}
            {t("ledger.void.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
