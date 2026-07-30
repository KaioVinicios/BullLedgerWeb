import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * The shape every `@tabler/icons-react` export actually has.
 *
 * The package exports an `Icon` alias of its own, but it is
 * `FunctionComponent<IconProps>`, and the icons are forwardRef components that
 * are not assignable to it — typing a prop as `Icon` makes every icon passed
 * to it an error. This is the type the icons genuinely have.
 */
export type IconComponent = ForwardRefExoticComponent<
  IconProps & RefAttributes<SVGSVGElement>
>;
