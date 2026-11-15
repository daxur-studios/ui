import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Component, inject, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITriggerConfig, PopupDirective, PopupService } from '@daxur-studios/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Advance the fake clock and let queued microtasks settle (replaces zone `tick`). */
const tick = (ms = 0): Promise<unknown> => vi.advanceTimersByTimeAsync(ms);

const HOVER: ITriggerConfig = {
  open: ['mouseenter'],
  close: ['mouseleave'],
  forceOpen: ['click'],
  forceClose: ['click', 'overlayOutsideClick', 'backdropClick'],
};

/** Click opens, a second click on the trigger closes, a click outside closes. */
const CLICK: ITriggerConfig = {
  open: ['click'],
  close: ['click'],
  forceOpen: [],
  forceClose: ['overlayOutsideClick', 'backdropClick'],
};

@Component({
  imports: [PopupDirective],
  template: `
    <button
      id="trigger"
      appPopup
      [popupTemplateRef]="tpl"
      [triggerConfig]="config"
      [(popupIsOpen)]="open"
    >
      Trigger
    </button>
    <div id="outside">outside</div>
    <ng-template #tpl>
      <div id="body">
        <button id="inside">inside</button>
      </div>
    </ng-template>
  `,
})
class HostComponent {
  config: ITriggerConfig = HOVER;
  readonly open = signal(false);
  readonly overlay = inject(Overlay);
  readonly popup = viewChild.required(PopupDirective);
}

interface IRig {
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
  trigger: HTMLElement;
}

function setup(config: ITriggerConfig = HOVER): IRig {
  TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.config = config;
  fixture.detectChanges();
  const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLElement;
  return { fixture, host: fixture.componentInstance, trigger };
}

const body = (): HTMLElement | null => document.querySelector('#body');
const panes = (): number => document.querySelectorAll('.cdk-overlay-pane').length;
const fire = (el: Element, type: string, init: MouseEventInit = {}): void => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
};
/** Click as the browser does: the document's capture listener sees it first. */
const click = (el: Element): void => fire(el, 'click');
const popupPane = (): HTMLElement => document.querySelector('.cdk-overlay-pane') as HTMLElement;

/** A second overlay opened after the popup, like a mat-select panel or a nested popup. */
function openChildOverlay(host: HostComponent): OverlayRef {
  const ref = host.overlay.create();
  ref.overlayElement.innerHTML = '<button id="child">child</button>';
  return ref;
}

describe('PopupDirective', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('hover mode', () => {
    it('opens on mouseenter and closes 450 ms after mouseleave', async () => {
      const { fixture, trigger } = setup();
      fire(trigger, 'mouseenter');
      await tick();
      fixture.detectChanges();
      expect(body()).not.toBeNull();

      fire(trigger, 'mouseleave');
      await tick(449);
      expect(body()).not.toBeNull();
      await tick(1);
      expect(body()).toBeNull();
    });

    it('stays open when the mouse moves from the trigger onto the popup', async () => {
      const { fixture, trigger } = setup();
      fire(trigger, 'mouseenter');
      await tick();
      fixture.detectChanges();

      fire(trigger, 'mouseleave');
      fire(popupPane(), 'mouseenter');
      await tick(1000);
      expect(body()).not.toBeNull();
    });

    it('closes after the mouse leaves the popup', async () => {
      const { fixture, trigger } = setup();
      fire(trigger, 'mouseenter');
      await tick();
      fixture.detectChanges();
      fire(popupPane(), 'mouseenter');
      fire(popupPane(), 'mouseleave');
      await tick(450);
      expect(body()).toBeNull();
    });

    it('stays open when the mouse moves from the popup onto a child overlay', async () => {
      const { fixture, host, trigger } = setup();
      fire(trigger, 'mouseenter');
      await tick();
      fixture.detectChanges();
      fire(popupPane(), 'mouseenter');
      const child = openChildOverlay(host);

      fire(popupPane(), 'mouseleave', { relatedTarget: child.overlayElement.querySelector('#child') });
      await tick(1000);
      expect(body()).not.toBeNull();
      child.dispose();
    });
  });

  describe('closing by click', () => {
    it('does not close on a click inside the popup', async () => {
      const { fixture, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();

      click(document.querySelector('#inside')!);
      await tick(1000);
      expect(body()).not.toBeNull();
    });

    it('closes on a click outside', async () => {
      const { fixture, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();

      click(fixture.nativeElement.querySelector('#outside'));
      await tick();
      expect(body()).toBeNull();
    });

    it('click mode: a second click on the trigger closes it', async () => {
      const { fixture, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();
      expect(body()).not.toBeNull();

      click(trigger);
      await tick();
      expect(body()).toBeNull();
    });

    it('hover mode: clicking the trigger while open keeps it open', async () => {
      const { fixture, trigger } = setup(HOVER);
      fire(trigger, 'mouseenter');
      await tick();
      fixture.detectChanges();

      click(trigger);
      await tick(1000);
      expect(body()).not.toBeNull();
    });

    it('closes on Escape', async () => {
      const { fixture, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await tick();
      expect(body()).toBeNull();
    });
  });

  describe('child overlays opened from inside the popup', () => {
    it('a click in another overlay does not close the popup', async () => {
      const { fixture, host, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();
      const child = openChildOverlay(host);

      click(child.overlayElement.querySelector('#child')!);
      await tick(1000);
      expect(body()).not.toBeNull();
      child.dispose();
    });
  });

  describe('state', () => {
    it('popupIsOpen follows the popup both ways', async () => {
      const { fixture, host, trigger } = setup(CLICK);
      click(trigger);
      await tick();
      fixture.detectChanges();
      expect(host.open()).toBe(true);

      click(fixture.nativeElement.querySelector('#outside'));
      await tick();
      fixture.detectChanges();
      expect(host.open()).toBe(false);

      host.open.set(true);
      fixture.detectChanges();
      await tick();
      expect(body()).not.toBeNull();

      host.open.set(false);
      fixture.detectChanges();
      await tick();
      expect(body()).toBeNull();
    });

    it('sets aria-expanded on the trigger', async () => {
      const { fixture, trigger } = setup(CLICK);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.getAttribute('aria-haspopup')).toBe('true');
      click(trigger);
      await tick();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('can be opened and closed by id through PopupService', async () => {
      const { fixture } = setup(CLICK);
      const service = TestBed.inject(PopupService);
      const id = fixture.componentInstance.popup().popupId!;

      service.showPopupById(id);
      await tick();
      fixture.detectChanges();
      expect(body()).not.toBeNull();

      fixture.componentInstance.popup().hide(true);
      await tick();
      expect(body()).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('leaves no overlay panes behind after many open/close cycles', async () => {
      const { fixture, host } = setup(CLICK);
      for (let i = 0; i < 20; i++) {
        host.popup().show(true);
        await tick();
        fixture.detectChanges();
        host.popup().hide(true);
        await tick();
      }
      expect(panes()).toBe(0);
    });

    it('removes its document click listener when closed', async () => {
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');
      const { fixture, host } = setup(CLICK);

      host.popup().show(true);
      await tick();
      fixture.detectChanges();
      host.popup().hide(true);
      await tick();

      const count = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([type]) => type === 'click').length;
      expect(count(added)).toBeGreaterThan(0);
      expect(count(removed)).toBe(count(added));
    });

    it('removes the overlay and listeners on destroy', async () => {
      const { fixture, host } = setup(CLICK);
      host.popup().show(true);
      await tick();
      fixture.detectChanges();

      fixture.destroy();
      await vi.runAllTimersAsync();
      expect(panes()).toBe(0);
    });
  });
});
