import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import type { AudioPlayer } from "expo-audio";

// Audio must never outlive the screen that started it. Unmount cleanup alone is
// not enough: a screen pushed on top leaves this one mounted but invisible, and
// the sound kept playing. Blur is the reliable signal, so every screen that
// plays audio pairs its player with this hook.
export function usePausedOnBlur(player: AudioPlayer | null): void {
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          player?.pause();
        } catch {
          // player already released
        }
      };
    }, [player]),
  );
}
