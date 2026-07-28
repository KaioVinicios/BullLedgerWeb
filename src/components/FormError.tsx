import { IconAlertTriangle } from "@tabler/icons-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

// Problems that belong to the whole form rather than to any one input:
// `non_field_errors` and `detail` from the server, plus client-side failures
// with no field to land on.
//
// Renders nothing until there is something to say, so a form keeps its resting
// height — the same contract `FieldError` keeps one level down. `Alert` already
// carries `role="alert"`, so the message announces itself on arrival without
// this component restating the role.
//
// No title: the server's sentence is the whole content, and a "Sign-in failed"
// heading above it would be ceremony. The icon is what keeps the error legible
// without relying on color alone.
export function FormError({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <IconAlertTriangle aria-hidden />
      <AlertDescription>
        {errors.length === 1 ? (
          errors[0]
        ) : (
          <ul className="list-outside list-disc space-y-1 pl-4">
            {errors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
