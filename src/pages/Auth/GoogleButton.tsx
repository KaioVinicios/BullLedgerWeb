import { GoogleLogo } from "@/components/GoogleLogo";
import { Button } from "@/components/ui/button";

export function GoogleButton({
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      {...props}
    >
      <GoogleLogo />
      {label}
    </Button>
  );
}
