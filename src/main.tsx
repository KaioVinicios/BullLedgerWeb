import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import "./index.css";
import "@/i18n/config";
import { queryClient, wireSessionRecovery } from "@/lib/queryClient";
import { router } from "@/routes/router";

wireSessionRecovery(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="bullledger-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
