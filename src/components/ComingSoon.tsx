import { IconTools } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/EmptyState";

/**
 * The stand-in every Phase 3 screen renders where its real body will go.
 *
 * Deliberately one component sharing one title: this is temporary, and it
 * should be one file to delete rather than eight screens to edit in two
 * locales. Each caller passes the sentence describing its own area.
 */
export function ComingSoon({ description }: { description: string }) {
  const { t } = useTranslation("app");

  return (
    <EmptyState
      icon={IconTools}
      title={t("comingSoon.title")}
      description={description}
    />
  );
}
