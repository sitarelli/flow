import { Assets, Texture } from 'pixi.js';
import { ASSET_PATHS } from './constants';

export interface LoadedAssets {
  background: Texture | null;
  dropHighlight: Texture | null;
}

/**
 * Tries to load each asset. Missing assets resolve to null — the renderer
 * falls back to programmatically-drawn placeholders. This lets the game run
 * end-to-end before the user provides final art.
 */
export async function loadAssets(): Promise<LoadedAssets> {
  const tryLoad = async (path: string): Promise<Texture | null> => {
    try {
      const tex = await Assets.load<Texture>(path);
      return tex ?? null;
    } catch {
      // Silently fall back — placeholders will be used.
      return null;
    }
  };

  const [background, dropHighlight] = await Promise.all([
    tryLoad(ASSET_PATHS.BACKGROUND),
    tryLoad(ASSET_PATHS.DROP_HIGHLIGHT),
  ]);

  return { background, dropHighlight };
}
