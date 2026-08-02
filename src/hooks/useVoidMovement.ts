import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ApiClientError } from "@/lib/apiError";
import {
  invalidateLedger,
  isTransferLeg,
  voidMovement,
  type Movement,
} from "@/services/movements";

/**
 * Voiding, from both places that offer it — the ledger's rows and a transfer
 * leg's own screen.
 *
 * One rejection is worth catching by name. `movement_lot_in_use` means this
 * entry's contribution still has live exits drawing on it, which is a problem
 * the user can fix: void those first, then this. That message belongs in the
 * dialog they are already looking at, not in a toast that disappears while
 * they read it. Every other failure is a failure, and says so once.
 */
export function useVoidMovement(onVoided?: () => void) {
  const { t } = useTranslation("app");
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Movement | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (movement: Movement) => voidMovement(movement.id),
    onSuccess: async () => {
      await invalidateLedger(queryClient);
      toast.success(t("ledger.void.succeeded"));
      setTarget(null);
      onVoided?.();
    },
    onError: (error) => {
      const recoverable =
        error instanceof ApiClientError &&
        error.fieldCodes("lot")[0] === "movement_lot_in_use"
          ? (error.fieldErrors("lot")[0] ?? null)
          : null;

      setProblem(recoverable);
      if (recoverable) return;

      setTarget(null);
      toast.error(t("ledger.void.failed"));
    },
  });

  return {
    /** Opens the dialog for one movement, or closes it with `null`. */
    ask(movement: Movement | null) {
      setProblem(null);
      setTarget(movement);
    },
    dialogProps: {
      open: target !== null,
      onOpenChange: (open: boolean) => {
        if (!open) {
          setTarget(null);
          setProblem(null);
        }
      },
      onConfirm: () => target && mutation.mutate(target),
      isPending: mutation.isPending,
      isTransferLeg: target !== null && isTransferLeg(target),
      problem,
    },
  };
}
