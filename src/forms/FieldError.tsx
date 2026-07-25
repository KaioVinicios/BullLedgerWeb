// Standard Schema issues arrive as objects; strings can also appear. Pull the
// first human-readable message either way.
function firstError(errors: unknown[]): string | undefined {
  const err = errors[0];
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) return String(err.message);
  return String(err);
}

// Renders nothing until there is a message, so the field keeps its resting
// height and the error only reaches screen readers once it exists.
export function FieldError({ id, errors }: { id: string; errors: unknown[] }) {
  const message = firstError(errors);
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}
