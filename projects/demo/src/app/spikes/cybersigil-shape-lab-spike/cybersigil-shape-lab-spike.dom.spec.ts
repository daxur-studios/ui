import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CybersigilShapeLabSpikeComponent } from './cybersigil-shape-lab-spike.component';

/** Filter reference every silhouette carries while the 3D chrome is on. */
const CHROME_FILTER = 'url(#sigil-liquid-chrome)';

/** Number of canvases: three full archetypes plus the three modular join widths. */
const CANVAS_COUNT = 6;

/** Number of concept references in the comparison strip. */
const REFERENCE_COUNT = 3;

describe('CybersigilShapeLabSpikeComponent', () => {
  let fixture: ComponentFixture<CybersigilShapeLabSpikeComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(CybersigilShapeLabSpikeComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  /** Clicks the inner button of a library `ui--button` identified by its test id. */
  function pressButton(testId: string): void {
    const button = root.querySelector<HTMLButtonElement>(`[data-testid="${testId}"] button`);
    if (!button) throw new Error(`button ${testId} is missing`);
    button.click();
    fixture.detectChanges();
  }

  function telemetry(testId: string): string | null {
    return root.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? null;
  }

  it('marks the stage and renders six canvases with path geometry', () => {
    expect(root.querySelector('[data-spike-stage]')).not.toBeNull();
    const canvases = root.querySelectorAll('[data-testid="sigil-canvas"]');
    expect(canvases.length).toBe(CANVAS_COUNT);
    for (const canvas of Array.from(canvases)) {
      const silhouette = canvas.querySelector('path');
      expect(silhouette?.getAttribute('d')?.startsWith('M')).toBe(true);
    }
  });

  it('starts with the mercury chrome filter on every silhouette', () => {
    expect(telemetry('active-material')).toBe('mercury');
    for (const silhouette of Array.from(root.querySelectorAll('.silhouette'))) {
      expect(silhouette.getAttribute('filter')).toBe(CHROME_FILTER);
    }
  });

  it('removes the filter from every silhouette when the flat preset is chosen', () => {
    pressButton('material-flat');
    expect(telemetry('active-material')).toBe('flat');
    for (const silhouette of Array.from(root.querySelectorAll('.silhouette'))) {
      expect(silhouette.hasAttribute('filter')).toBe(false);
    }
  });

  it('applies the chosen metal to the chrome palette scope', () => {
    pressButton('material-bronze');
    expect(root.querySelector('svg[data-material]')?.getAttribute('data-material')).toBe('bronze');
  });

  it('restores the last chrome metal when the 3D chrome toggle turns back on', () => {
    pressButton('material-anodized');
    pressButton('chrome-toggle');
    expect(telemetry('active-material')).toBe('flat');

    pressButton('chrome-toggle');
    expect(telemetry('active-material')).toBe('anodized');
  });

  it('shows the concept reference strip only when its toggle is pressed', () => {
    expect(root.querySelector('[data-testid="reference-strip"]')).toBeNull();

    pressButton('reference-toggle');
    const strip = root.querySelector('[data-testid="reference-strip"]');
    expect(strip?.querySelectorAll('img').length).toBe(REFERENCE_COUNT);
  });
});
