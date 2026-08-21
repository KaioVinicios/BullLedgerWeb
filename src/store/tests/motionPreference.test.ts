import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MOTION_STORAGE_KEY,
  REDUCE_MOTION_ATTRIBUTE,
  useMotionPreference,
} from "@/store/motionPreference";

/** What `persist` wrote, read back the way another tab would read it. */
function stored() {
  const raw = localStorage.getItem(MOTION_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw).state;
}

beforeEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
  localStorage.clear();
});

afterEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
  document.documentElement.removeAttribute(REDUCE_MOTION_ATTRIBUTE);
});

describe("useMotionPreference", () => {
  it("lets the interface move until someone says otherwise", () => {
    const { reduceMotion, hideBackground } = useMotionPreference.getState();

    expect(reduceMotion).toBe(false);
    expect(hideBackground).toBe(false);
  });

  it("keeps the two switches apart, so neither erases the other", () => {
    useMotionPreference.getState().setHideBackground(true);
    useMotionPreference.getState().setReduceMotion(true);
    useMotionPreference.getState().setReduceMotion(false);

    // The background is still off on its own account, which is the point of
    // storing them separately rather than collapsing them into one flag.
    expect(useMotionPreference.getState().hideBackground).toBe(true);
  });

  it("writes both switches to localStorage and nowhere else", () => {
    useMotionPreference.getState().setReduceMotion(true);
    useMotionPreference.getState().setHideBackground(true);

    expect(stored()).toEqual({ reduceMotion: true, hideBackground: true });
    // The preference is the device's; a cookie would ride along on every API
    // request for a value the API has no use for.
    expect(document.cookie).not.toContain("motion");
  });

  it("stores only the two values, never the setters", () => {
    useMotionPreference.getState().setReduceMotion(true);

    expect(Object.keys(stored())).toEqual(["reduceMotion", "hideBackground"]);
  });

  it("marks the document while animations are off, and unmarks it after", () => {
    const html = document.documentElement;

    useMotionPreference.getState().setReduceMotion(true);
    expect(html.hasAttribute(REDUCE_MOTION_ATTRIBUTE)).toBe(true);

    useMotionPreference.getState().setReduceMotion(false);
    expect(html.hasAttribute(REDUCE_MOTION_ATTRIBUTE)).toBe(false);
  });

  it("does not mark the document for the background switch alone", () => {
    // Hiding the field is React's job. The attribute exists for the CSS rule
    // that flattens motion the app did not author, which this switch is not
    // asking for.
    useMotionPreference.getState().setHideBackground(true);

    expect(document.documentElement.hasAttribute(REDUCE_MOTION_ATTRIBUTE)).toBe(
      false,
    );
  });
});
