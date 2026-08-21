import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMotionPreference } from "@/store/motionPreference";

/**
 * The ambient field behind the authenticated content: a grid of near-invisible
 * dots that a slow gold wave crosses on the diagonal, every twenty seconds.
 *
 * All of the drawing is in `index.css` under `.pulse-field`, which is also
 * where the reasoning about masks, compositing, and the contrast budget lives.
 * This file owns only the question of *whether* it runs, and there are three
 * ways for the answer to be no:
 *
 * - The reader switched the background off in Profile.
 * - The reader switched every animation off in Profile, which contains the
 *   first: an animated background is an animation.
 * - The reader asked the operating system for reduced motion.
 *
 * The third case is not the same answer as the first two. PRODUCT.md asks for
 * a reduced-motion *alternative* to every animation rather than its removal,
 * and the alternative here is the field standing still: the dots stay, the
 * wave never runs. The texture was never the moving part. An explicit switch
 * in Profile does mean removal, because a reader who went looking for it
 * asked about the decoration and not about the motion.
 *
 * Nothing needs to pause this when the tab is hidden. Browsers do not paint
 * background tabs, so an unpainted CSS animation produces no frames — which
 * is a reason to have built it in CSS rather than on a timer.
 */
export function PulseField() {
  const off = useMotionPreference(
    (state) => state.reduceMotion || state.hideBackground,
  );
  const systemAsksForStillness = usePrefersReducedMotion();

  if (off) return null;

  return (
    <div className="pulse-field" data-pulse-field aria-hidden>
      <div className="pulse-field-viewport">
        {!systemAsksForStillness && (
          <div className="pulse-field-wave" data-pulse-wave />
        )}
      </div>
    </div>
  );
}
