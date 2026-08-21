import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

/**
 * Two motion preferences that belong to the device, not to the account.
 *
 * Deliberately not on the profile: the reason to switch these off is the
 * machine in front of you, and the same person on a fast desktop and a
 * six-year-old phone wants two different answers. Sending them to the server
 * would give one answer to both. That also rules out a cookie, which would
 * ride along on every API request for a value the API has no use for, so
 * `localStorage` is the store — the same place `next-themes` already keeps
 * the theme, under a key in the same family.
 *
 * `reduceMotion` contains `hideBackground`: an animated background is an
 * animation, so switching all motion off switches the field off too. The two
 * are still stored separately, because "I want the app calm but I like the
 * background" and "the background specifically bothers me" are different
 * requests, and collapsing them would lose whichever one is not currently in
 * force. `AppearanceSection` renders that containment; nothing here enforces
 * it, so a reader of this file never has to guess which switch wins.
 */
export interface MotionPreference {
  /** Every animation in the app, the background field included. */
  reduceMotion: boolean;
  /** Only the ambient dot field behind the authenticated content. */
  hideBackground: boolean;
  setReduceMotion: (value: boolean) => void;
  setHideBackground: (value: boolean) => void;
}

export const MOTION_STORAGE_KEY = "bullledger-motion";

/**
 * The attribute `index.css` keys its flattening rule off, mirroring what the
 * `prefers-reduced-motion` media query does for the reader who asked the
 * system instead of asking us.
 */
export const REDUCE_MOTION_ATTRIBUTE = "data-reduce-motion";

function applyReduceMotion(reduceMotion: boolean): void {
  if (typeof document === "undefined") return;

  if (reduceMotion) {
    document.documentElement.setAttribute(REDUCE_MOTION_ATTRIBUTE, "");
  } else {
    document.documentElement.removeAttribute(REDUCE_MOTION_ATTRIBUTE);
  }
}

/**
 * `localStorage`, or a stand-in for the browsers that will not lend it.
 *
 * Safari with cookies blocked keeps the object and throws on the write, so
 * the failure arrives at the moment someone ticks a box rather than at
 * startup, and zustand's own guard does not cover it — it checks whether the
 * storage *exists*, not whether writing to it works. Falling back to memory
 * costs the preference its permanence and keeps the checkbox working, which
 * is the right way round: a setting that forgets itself after a reload is a
 * smaller failure than a Profile screen that throws when touched.
 */
const memory = new Map<string, string>();

const deviceStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const useMotionPreference = create<MotionPreference>()(
  persist(
    (set) => ({
      reduceMotion: false,
      hideBackground: false,
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHideBackground: (hideBackground) => set({ hideBackground }),
    }),
    {
      name: MOTION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
      partialize: ({ reduceMotion, hideBackground }) => ({
        reduceMotion,
        hideBackground,
      }),
    },
  ),
);

/**
 * Keep the document attribute in step with the store.
 *
 * The inline script in `index.html` sets it before first paint, because a
 * reader who asked for no animation should not be shown one while the bundle
 * parses. This subscription owns every change after that. Both exist for the
 * same reason the theme has both: one for the frame before React, one for
 * every frame after it.
 *
 * `persist` hydrates synchronously from `localStorage`, so the state read on
 * the next line is already the stored one rather than the default.
 */
applyReduceMotion(useMotionPreference.getState().reduceMotion);

useMotionPreference.subscribe((state, previous) => {
  if (state.reduceMotion !== previous.reduceMotion) {
    applyReduceMotion(state.reduceMotion);
  }
});
