import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  ButtonComponent,
  composeBranchingConnector,
  composeCalyxFrame,
  composeCornerSpandrel,
  composeToolbarCrown,
  composeTopologicalFiligreeCrest,
  composeTopologicalTendril,
  composeTopologicalWingedStar,
  composeWaistDivider,
  DEFAULT_SIGIL_LAB_PARAMS,
  SIGIL_BASELINE_STRATEGY,
  SIGIL_DEFAULT_HEIGHTMAP_BLUR,
  SIGIL_DEFAULT_LIGHT_X,
  SIGIL_DEFAULT_LIGHT_Y,
  SIGIL_DEFAULT_SPECULAR_EXPONENT,
  SIGIL_DEFAULT_SURFACE_SCALE,
  SIGIL_LIQUID_CHROME_FILTER_ID,
  SIGIL_STAR_BLOOM_FILTER_ID,
  SIGIL_STRATEGIES,
  SIGIL_TOPOLOGICAL_SDF_STRATEGY,
  SigilChromeComponent,
  SigilMaterial,
  SliderComponent,
  type ISigilLabParams,
  type ISigilRichGeometry,
  type ISigilStrategy,
  type SigilStrategySlot,
} from '@daxur-studios/ui';

/** Slider readings are whole percentages, so the unit-interval knobs are divided by this value. */
const PERCENT_SCALE = 100;

/** First deterministic variation of the seeded generator. */
const DEFAULT_SEED = 1;

/** Number of seeds shown simultaneously in the Seed Matrix Gallery. */
const MATRIX_SEED_COUNT = 6;

/** Initial geometry knob readings in percent, mirroring `DEFAULT_SIGIL_LAB_PARAMS`. */
const INITIAL_CURVATURE = DEFAULT_SIGIL_LAB_PARAMS.curvature * PERCENT_SCALE;
const INITIAL_SWELL = DEFAULT_SIGIL_LAB_PARAMS.swell * PERCENT_SCALE;
const INITIAL_CRESCENT_DEPTH = DEFAULT_SIGIL_LAB_PARAMS.crescentDepth * PERCENT_SCALE;
const INITIAL_ASYMMETRY = DEFAULT_SIGIL_LAB_PARAMS.asymmetry * PERCENT_SCALE;
const INITIAL_SPIKE_LENGTH = DEFAULT_SIGIL_LAB_PARAMS.spikeLength * PERCENT_SCALE;

/** Rail widths for archetype 4, in user units. They show the join stretching without seam breaks. */
const JOIN_WIDTHS = [240, 420, 600] as const;

/** The widest join fills its card, so narrower joins are drawn at the same scale and their caps match. */
const MAX_JOIN_WIDTH = Math.max(...JOIN_WIDTHS);

/** Material used on first paint, and restored when the chrome toggle turns back on. */
const DEFAULT_MATERIAL: SigilMaterial = 'mercury';

/** Media query that switches pointer glints off, so screenshot captures stay deterministic. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Folder of the concept art, served from `public/`. */
const CONCEPT_DIR = '/concept/cybersigillism/';

/** Concept references shown in the comparison strip. */
const REFERENCES = [
  { file: 'cycbersigil-concept (6).jpg', label: 'Favourite #1 · winged star (6)' },
  { file: 'cycbersigil-concept (7).jpg', label: 'Favourite #2 · filigree crest (7)' },
  { file: 'cycbersigil-concept (1).jpg', label: 'Favourite #3 · S-curve tendril (1)' },
  { file: 'cyber (1).jpg', label: 'UI Chrome · desktop toolbar & connectors' },
  { file: 'cyber (3).jpg', label: 'UI Chrome · waist divider & spandrels' },
] as const;

/** Workbench inspection modes. */
export type SigilLabMode = 'archetypes' | 'ui-parts' | 'seed-matrix' | 'ui-composite';

/** Part keys available in the Seed Matrix Gallery. */
export type SigilMatrixPart =
  'winged-star' | 'filigree-crest' | 'tendril' | 'toolbar' | 'corner' | 'divider' | 'connector';

/** Geometry knobs as the sliders show them. Unit-interval fields are whole percentages. */
interface ISigilLabControls {
  readonly curvature: number;
  readonly swell: number;
  readonly thornCount: number;
  readonly crescentDepth: number;
  readonly asymmetry: number;
  readonly spikeLength: number;
}

/**
 * Spike 09a: Procedural Cybersigil & UI Chrome Workbench.
 * Supports inspecting:
 * 1. Ornamental Archetypes (Winged Star, Filigree Crest, S-Curve Tendril, Modular Join)
 * 2. Architectural UI Chrome Parts (Toolbar Crown, 4-Corner Spandrels, Waist Divider, Branching Connector, Calyx Pill)
 * 3. 6-Seed Uniqueness Matrix (verifying genuine topological diversity across seeds)
 * 4. Live Cybersigil UI Window Composite (mirroring `cyber (1).jpg` & `cyber (3).jpg`)
 */
@Component({
  selector: 'app-cybersigil-shape-lab-spike',
  imports: [ButtonComponent, SigilChromeComponent, SliderComponent],
  templateUrl: './cybersigil-shape-lab-spike.component.html',
  styleUrl: './cybersigil-shape-lab-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CybersigilShapeLabSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly references = REFERENCES;
  protected readonly joinWidths = JOIN_WIDTHS;
  protected readonly seed = signal(DEFAULT_SEED);
  protected readonly mode = signal<SigilLabMode>('archetypes');
  protected readonly matrixPart = signal<SigilMatrixPart>('winged-star');
  protected readonly connectorRows = signal(3);
  protected readonly pearlBackdrop = signal(false);

  protected readonly geometry = signal<ISigilLabControls>({
    curvature: INITIAL_CURVATURE,
    swell: INITIAL_SWELL,
    thornCount: DEFAULT_SIGIL_LAB_PARAMS.thornCount,
    crescentDepth: INITIAL_CRESCENT_DEPTH,
    asymmetry: INITIAL_ASYMMETRY,
    spikeLength: INITIAL_SPIKE_LENGTH,
  });

  protected readonly material = signal<SigilMaterial>(DEFAULT_MATERIAL);
  protected readonly lastChromeMaterial = signal<SigilMaterial>(DEFAULT_MATERIAL);
  protected readonly chromeOn = computed(() => this.material() !== 'flat');
  protected readonly showReferences = signal(false);
  protected readonly interactiveLight = signal(true);

  protected readonly heightmapBlur = signal(SIGIL_DEFAULT_HEIGHTMAP_BLUR);
  protected readonly surfaceScale = signal(SIGIL_DEFAULT_SURFACE_SCALE);
  protected readonly specularExponent = signal(SIGIL_DEFAULT_SPECULAR_EXPONENT);
  protected readonly lightX = signal(SIGIL_DEFAULT_LIGHT_X);
  protected readonly lightY = signal(SIGIL_DEFAULT_LIGHT_Y);

  /** Knob readings converted to the unit interval that `sigil-math` expects. */
  protected readonly params = computed<ISigilLabParams & { seed: number }>(() => {
    const knobs = this.geometry();
    return {
      seed: this.seed(),
      curvature: knobs.curvature / PERCENT_SCALE,
      swell: knobs.swell / PERCENT_SCALE,
      thornCount: knobs.thornCount,
      crescentDepth: knobs.crescentDepth / PERCENT_SCALE,
      asymmetry: knobs.asymmetry / PERCENT_SCALE,
      spikeLength: knobs.spikeLength / PERCENT_SCALE,
    };
  });

  /** Strategy id chosen for each archetype slot. Defaults to the v2 Topological SDF engine. */
  protected readonly picks = signal<Record<SigilStrategySlot, string>>({
    star: SIGIL_TOPOLOGICAL_SDF_STRATEGY.id,
    crest: SIGIL_TOPOLOGICAL_SDF_STRATEGY.id,
    tendril: SIGIL_TOPOLOGICAL_SDF_STRATEGY.id,
    join: SIGIL_TOPOLOGICAL_SDF_STRATEGY.id,
  });

  /** Every registered strategy, offered by each select. */
  protected readonly strategies = SIGIL_STRATEGIES;

  /** Archetype slots in display order, with their select labels. */
  protected readonly slots: readonly SigilStrategySlot[] = ['star', 'crest', 'tendril', 'join'];
  protected readonly slotLabels: Record<SigilStrategySlot, string> = {
    star: 'Winged star',
    crest: 'Filigree crest',
    tendril: 'S-curve tendril',
    join: 'Modular join',
  };

  /** Shared id when every slot agrees, or an empty string when the slots are mixed. */
  protected readonly sharedStrategy = computed(() => {
    const ids = Object.values(this.picks());
    return ids.every((id) => id === ids[0]) ? ids[0] : '';
  });

  protected readonly winged = computed(() => this.resolve('star').star(this.params()));
  protected readonly crest = computed(() => this.resolve('crest').crest(this.params()));
  protected readonly tendril = computed(() => this.resolve('tendril').tendril(this.params()));
  protected readonly joins = computed(() =>
    JOIN_WIDTHS.map((width) => this.resolve('join').join(this.params(), width)),
  );

  /** Architectural UI Chrome parts. */
  protected readonly toolbarCrown = computed(() => composeToolbarCrown(this.params(), this.seed()));
  protected readonly cornerTl = computed(() =>
    composeCornerSpandrel(this.params(), this.seed(), 120, 'tl'),
  );
  protected readonly cornerTr = computed(() =>
    composeCornerSpandrel(this.params(), this.seed(), 120, 'tr'),
  );
  protected readonly cornerBl = computed(() =>
    composeCornerSpandrel(this.params(), this.seed(), 120, 'bl'),
  );
  protected readonly cornerBr = computed(() =>
    composeCornerSpandrel(this.params(), this.seed(), 120, 'br'),
  );
  protected readonly waistDivider = computed(() => composeWaistDivider(this.params(), this.seed()));
  protected readonly branchingConnector = computed(() => {
    const count = this.connectorRows();
    const ys: number[] = [];
    for (let i = 0; i < count; i++) {
      ys.push(36 + (i * 168) / Math.max(1, count - 1));
    }
    return composeBranchingConnector(this.params(), this.seed(), ys);
  });
  protected readonly calyxFrame = computed(() => composeCalyxFrame(this.params(), this.seed()));

  /** 6-Seed Matrix items for the selected `matrixPart`. */
  protected readonly matrixItems = computed<readonly (ISigilRichGeometry & { seed: number })[]>(
    () => {
      const baseSeed = this.seed();
      const p = this.params();
      const part = this.matrixPart();
      const items: (ISigilRichGeometry & { seed: number })[] = [];
      for (let offset = 0; offset < MATRIX_SEED_COUNT; offset++) {
        const s = baseSeed + offset;
        switch (part) {
          case 'winged-star':
            items.push(composeTopologicalWingedStar(p, s));
            break;
          case 'filigree-crest':
            items.push(composeTopologicalFiligreeCrest(p, s));
            break;
          case 'tendril':
            items.push(composeTopologicalTendril(p, s));
            break;
          case 'toolbar':
            items.push(composeToolbarCrown(p, s));
            break;
          case 'corner':
            items.push(composeCornerSpandrel(p, s, 120, 'tl'));
            break;
          case 'divider':
            items.push(composeWaistDivider(p, s));
            break;
          case 'connector':
            items.push(composeBranchingConnector(p, s, [40, 120, 200]));
            break;
        }
      }
      return items;
    },
  );

  /** Share of the card a join occupies, as a percentage. Equal scale across widths keeps the caps the same size. */
  protected joinPercent(width: number): number {
    return (width / MAX_JOIN_WIDTH) * PERCENT_SCALE;
  }

  /** Liquid-chrome filter reference, or `null` when the flat silhouette is selected. */
  protected readonly chromeFilter = computed(() =>
    this.chromeOn() ? `url(#${SIGIL_LIQUID_CHROME_FILTER_ID})` : null,
  );

  /** Star bloom reference, shown only on the winged star canvas and only with chrome on. */
  protected readonly bloomFilter = computed(() =>
    this.chromeOn() ? `url(#${SIGIL_STAR_BLOOM_FILTER_ID})` : null,
  );

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  /** Strategy the lab currently draws for one archetype slot. Unknown ids fall back to the baseline. */
  private resolve(slot: SigilStrategySlot): ISigilStrategy {
    const id = this.picks()[slot];
    return SIGIL_STRATEGIES.find((strategy) => strategy.id === id) ?? SIGIL_BASELINE_STRATEGY;
  }

  /** Points one archetype slot at a strategy. */
  protected selectStrategy(slot: SigilStrategySlot, id: string): void {
    this.picks.update((current) => ({ ...current, [slot]: id }));
  }

  /** Points every archetype slot at one strategy. An empty id is the "mixed" placeholder and is ignored. */
  protected selectAllStrategies(id: string): void {
    if (!id) return;
    this.picks.set({ star: id, crest: id, tendril: id, join: id });
  }

  /** Reads the chosen value from a select's change event. */
  protected eventValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  /** Writes one geometry knob from a slider reading. */
  protected setGeometry(key: keyof ISigilLabControls, value: number): void {
    this.geometry.update((knobs) => ({ ...knobs, [key]: value }));
  }

  /** Selects a metallic preset. Choosing a chrome preset also remembers it for the toggle. */
  protected selectMaterial(material: SigilMaterial): void {
    this.material.set(material);
    if (material !== 'flat') this.lastChromeMaterial.set(material);
    this.pearlBackdrop.set(material === 'pearl');
  }

  /** Turns the 3D chrome filter on (restoring the last metal) or off (flat silhouette). */
  protected setChrome(on: boolean): void {
    this.material.set(on ? this.lastChromeMaterial() : 'flat');
  }

  /** Moves the shared point light to the pointer, in the hovered canvas's user units. */
  protected onCanvasPointer(event: PointerEvent, width: number, height: number): void {
    if (!this.chromeOn() || !this.interactiveLight() || this.prefersReducedMotion()) return;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    this.lightX.set(((event.clientX - rect.left) / rect.width) * width);
    this.lightY.set(((event.clientY - rect.top) / rect.height) * height);
  }

  /** Returns the light to its static default when the pointer leaves a canvas. */
  protected onCanvasLeave(): void {
    this.lightX.set(SIGIL_DEFAULT_LIGHT_X);
    this.lightY.set(SIGIL_DEFAULT_LIGHT_Y);
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  /** Public URL of a concept reference image. */
  protected conceptSrc(file: string): string {
    return `${CONCEPT_DIR}${file}`;
  }
}
