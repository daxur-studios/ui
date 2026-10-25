import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Metallic preset for the chrome filter. `mercury`, `bronze` and `anodized` pick a palette from the
 * `--ui-sigil-*` tokens. `flat` selects the palette too, but consumers that honour it skip the filter
 * and show the raw silhouette.
 */
export type SigilMaterial = 'mercury' | 'bronze' | 'anodized' | 'flat';

/** DOM id of the liquid-chrome filter. Render `ui--sigil-chrome` once per document so the id stays unique. */
export const SIGIL_LIQUID_CHROME_FILTER_ID = 'sigil-liquid-chrome';

/** DOM id of the star bloom filter. Same render-once rule as {@link SIGIL_LIQUID_CHROME_FILTER_ID}. */
export const SIGIL_STAR_BLOOM_FILTER_ID = 'sigil-star-bloom';

/**
 * Default heightmap blur, the `stdDeviation` in user units. Larger values turn the silhouette into a
 * softer hill, and smaller values keep the veins sharp.
 */
export const SIGIL_DEFAULT_HEIGHTMAP_BLUR = 3;

/** Default `surfaceScale`, the height multiplier applied to the blurred heightmap. */
export const SIGIL_DEFAULT_SURFACE_SCALE = 4;

/** Default `specularExponent`. Higher values give a sharper, more mirror-like glint. */
export const SIGIL_DEFAULT_SPECULAR_EXPONENT = 20;

/** Coefficient of the specular term. Fixed so the palette, not the slider, sets overall brightness. */
export const SIGIL_SPECULAR_CONSTANT = 1.2;

/** X position of the static point light, in user units. Used when no pointer is tracking. */
export const SIGIL_DEFAULT_LIGHT_X = 120;

/** Y position of the static point light, in user units. */
export const SIGIL_DEFAULT_LIGHT_Y = 40;

/** Height of the static point light above the canvas, in user units. */
export const SIGIL_DEFAULT_LIGHT_Z = 160;

/** Radius in user units of the erode step that carves the rim band off the silhouette edge. */
export const SIGIL_DEFAULT_RIM_WIDTH = 1;

/** Gain applied to the chrome curve. Above 1 brightens the ridges without moving the palette. */
export const SIGIL_CHROME_AMPLITUDE = 1.15;

/** Gamma exponent of the chrome curve. Below 1 lifts the mid-tones so the metal reads as reflective. */
export const SIGIL_CHROME_EXPONENT = 0.75;

/** `stdDeviation` of the star bloom blur, in user units. */
export const SIGIL_BLOOM_DEVIATION = 4;

/**
 * Hidden SVG that defines the cybersigil lighting filters. It has no visible box and is referenced by
 * `filter="url(#sigil-liquid-chrome)"` from any sigil canvas in the same document.
 *
 * The pipeline runs in this order:
 * 1. `feGaussianBlur` of the silhouette makes a heightmap, so wide veins become ridges.
 * 2. `feSpecularLighting` lights that heightmap from a point light, which the pointer can move.
 * 3. `feComponentTransfer` shapes the glint into a chrome curve.
 * 4. A dark body fill and a rim band are composited on the silhouette, then everything is merged.
 *
 * Palette colours come from `--ui-sigil-*` tokens through the `data-material` scope, so one attribute
 * switches the whole chrome. The component is OnPush and is driven only by its inputs.
 */
@Component({
  selector: 'ui--sigil-chrome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sigil-chrome.component.html',
  styleUrl: './sigil-chrome.component.scss',
})
export class SigilChromeComponent {
  /** Palette preset. Each preset maps to its own `--ui-sigil-*` tokens. */
  readonly material = input<SigilMaterial>('mercury');

  /** `stdDeviation` of the heightmap blur, in user units. */
  readonly heightmapBlur = input(SIGIL_DEFAULT_HEIGHTMAP_BLUR);

  /** Height multiplier of the heightmap. */
  readonly surfaceScale = input(SIGIL_DEFAULT_SURFACE_SCALE);

  /** Mirror-sharpness of the glint. */
  readonly specularExponent = input(SIGIL_DEFAULT_SPECULAR_EXPONENT);

  /** Point light X in user units. Pointer tracking sets this on the consuming page. */
  readonly lightX = input(SIGIL_DEFAULT_LIGHT_X);

  /** Point light Y in user units. */
  readonly lightY = input(SIGIL_DEFAULT_LIGHT_Y);

  /** Point light height in user units. */
  readonly lightZ = input(SIGIL_DEFAULT_LIGHT_Z);

  /** Rim band radius in user units. */
  readonly rimWidth = input(SIGIL_DEFAULT_RIM_WIDTH);

  protected readonly specularConstant = SIGIL_SPECULAR_CONSTANT;
  protected readonly chromeAmplitude = SIGIL_CHROME_AMPLITUDE;
  protected readonly chromeExponent = SIGIL_CHROME_EXPONENT;
  protected readonly bloomDeviation = SIGIL_BLOOM_DEVIATION;
  protected readonly liquidChromeId = SIGIL_LIQUID_CHROME_FILTER_ID;
  protected readonly starBloomId = SIGIL_STAR_BLOOM_FILTER_ID;
}
