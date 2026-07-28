import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import "./index.css";
import "@/i18n/config";
import { ensureCsrfToken } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import { setOnSessionLost } from "@/lib/sessionRecovery";
import { handleSessionLost } from "@/routes/endSession";
import { router } from "@/routes/router";

// The composition root owns this wiring: transport announces that a refresh
// failed, and the routing layer decides what that means for where the user is.
setOnSessionLost(() => handleSessionLost(queryClient, router));

// The API authenticates by cookie and therefore rejects any unsafe request
// that does not echo a CSRF token, and it hands that token out from one
// endpoint and nowhere else. Acquiring it is a startup step, not something a
// screen discovers it needs. Deliberately not awaited: the first paint should
// not wait on a round trip, and every unsafe request awaits the same promise
// before it goes out, so a write can never overtake it.
void ensureCsrfToken();

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
