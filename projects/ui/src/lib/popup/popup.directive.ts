import {
  ConnectedPosition,
  Overlay,
  OverlayPositionBuilder,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Injectable,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  model,
  untracked,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';

export type OverlayTriggerEvent =
  | 'click'
  | 'mouseenter'
  | 'mouseleave'
  | 'overlayOutsideClick'
  | 'backdropClick';
export interface ITriggerConfig {
  open?: Array<OverlayTriggerEvent>;
  close?: Array<OverlayTriggerEvent>;
  forceOpen?: Array<OverlayTriggerEvent>;
  forceClose?: Array<OverlayTriggerEvent>;
}

/**
 * Shows a template in a CDK overlay next to the host element.
 *
 * - Open and close on hover, click, outside click or backdrop click (`triggerConfig`).
 * - Clicks and hovers inside an overlay opened from within the popup (a
 *   `mat-select` panel, a nested popup) count as inside: they never close it.
 * - Escape closes it. The host gets `aria-haspopup` and `aria-expanded`.
 * - `[(popupIsOpen)]` opens and closes it from outside and follows it back.
 */
@Directive({
  selector: '[appPopup]',
  standalone: true,
  host: {
    '[attr.aria-haspopup]': '"true"',
    '[attr.aria-expanded]': 'popupIsOpen()',
  },
})
export class PopupDirective implements OnInit, OnDestroy {
  //#region Output Events
  @Output() public readonly onPopupOpened: EventEmitter<void> =
    new EventEmitter();
  @Output() public readonly onPopupClosed: EventEmitter<void> =
    new EventEmitter();
  //#endregion

  //#region Input Properties
  @Input({ required: false }) popupId?: string;
  readonly popupTemplateRef = input.required<TemplateRef<any>>();

  @Input({ required: false }) showPopupCondition: boolean = true;

  @Input({ required: false }) popupOpenTimeout: number = 0;
  @Input({ required: false }) popupCloseTimeout: number = 450;

  private _openOverlaySubscription?: Subscription;
  private _closeOverlaySubscription?: Subscription;

  /** `cdkConnectedOverlayPositions` A connected position as specified by the user. */
  @Input({ required: false }) popupPositions?: Array<ConnectedPosition>;
  /** `cdkConnectedOverlayPush` Sets whether the overlay can be pushed on-screen if none of the provided positions fit. */
  @Input({ required: false }) popupPush: boolean = true;
  /** Whether or not the overlay should be locked when scrolling. */
  @Input({ required: false }) popupLockScroll: boolean = false;
  /** `cdkConnectedOverlayPanelClass` The custom class to add to the overlay pane element. */
  @Input({ required: false }) popupPanelClass?: string;
  /** Whether the overlay has a backdrop. */
  @Input({ required: false }) popupHasBackdrop: boolean = false;
  /**
   * Whether the popup is open. Two-way: `[(popupIsOpen)]="flag"` opens or
   * closes it from outside, and follows it when a trigger event changes it.
   */
  readonly popupIsOpen = model(false);

  /**
   * Configure on which events the overlay should be opened and closed.
   * A trigger `click` while open closes it only when `close`/`forceClose`
   * has `click` and `forceOpen` does not.
   */
  readonly triggerConfig = input<ITriggerConfig>({
    open: ['mouseenter'],
    close: ['mouseleave'],
    forceOpen: ['click'],
    forceClose: ['click', 'overlayOutsideClick', 'backdropClick'],
  });
  //#endregion

  private readonly document = inject(DOCUMENT);
  private readonly popupService = inject(PopupService);
  private readonly overlay = inject(Overlay);
  private readonly overlayPositionBuilder = inject(OverlayPositionBuilder);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private overlayRef: OverlayRef | undefined;
  private isMouseOverOverlay = false;
  private _backdropClickSubscription?: Subscription;

  private readonly onMouseEnterOverlayBound = () => {
    this.isMouseOverOverlay = true;
  };
  private readonly onMouseLeaveOverlayBound = (event: MouseEvent) => {
    // Moving onto an overlay opened from inside this one (a mat-select panel) is still "inside".
    if (this.isChildOverlayTarget(event.relatedTarget)) return;
    this.isMouseOverOverlay = false;
    if (this.has('close', 'mouseleave') || this.has('forceClose', 'mouseleave')) {
      this.hide(this.has('forceClose', 'mouseleave'));
    }
  };
  private readonly handleDocumentClickBound = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!this.overlayRef || !target) return;
    if (this.overlayRef.overlayElement.contains(target)) return;
    if (this.elementRef.nativeElement.contains(target)) return; // the trigger handles its own clicks
    if (this.isChildOverlayTarget(target)) return;
    if (this.has('close', 'overlayOutsideClick') || this.has('forceClose', 'overlayOutsideClick')) {
      this.hide(this.has('forceClose', 'overlayOutsideClick'));
    }
  };
  private readonly handleKeydownBound = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented && this.overlayRef) {
      this.hide(true);
    }
  };

  private has(list: keyof ITriggerConfig, event: OverlayTriggerEvent): boolean {
    return !!this.triggerConfig()?.[list]?.includes(event);
  }

  /** True when `target` sits in an overlay (or its backdrop) created after this popup's. */
  private isChildOverlayTarget(target: EventTarget | null): boolean {
    const own = this.overlayRef?.overlayElement;
    if (!own || !(target instanceof Element)) return false;
    const other = target.closest('.cdk-overlay-pane, .cdk-overlay-backdrop');
    if (!other || other === own || own.contains(other)) return false;
    return !!(own.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  //#region Trigger Events
  @HostListener('click')
  click() {
    if (this.overlayRef) {
      if (this.has('forceOpen', 'click')) return;
      if (this.has('close', 'click') || this.has('forceClose', 'click')) {
        this.hide(true);
      }
      return;
    }
    if (this.has('open', 'click') || this.has('forceOpen', 'click')) {
      this.show(true);
    }
  }

  @HostListener('mouseenter')
  mouseenter() {
    if (this.has('open', 'mouseenter') || this.has('forceOpen', 'mouseenter')) {
      this.show(this.has('forceOpen', 'mouseenter'));
    }
  }

  @HostListener('mouseleave')
  mouseleave() {
    if (this.has('close', 'mouseleave') || this.has('forceClose', 'mouseleave')) {
      this.hide(this.has('forceClose', 'mouseleave'));
    }
  }
  //#endregion

  private readonly defaultPositions: Array<ConnectedPosition> = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 8,
    },
    // Right side position
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
    },
    // Left side position
    {
      originX: 'start',
      originY: 'center',
      overlayX: 'end',
      overlayY: 'center',
    },
  ];

  public show(force?: boolean) {
    // Cancel any existing timer subscriptions
    this._openOverlaySubscription?.unsubscribe();
    this._closeOverlaySubscription?.unsubscribe();

    if (!this.showPopupCondition) {
      return;
    }

    this._openOverlaySubscription = timer(
      force ? 0 : this.popupOpenTimeout,
    ).subscribe(() => {
      if (this.overlayRef) {
        return; // Overlay already opened
      }

      const positionStrategy = this.overlayPositionBuilder
        .flexibleConnectedTo(this.elementRef)
        .withPositions(this.popupPositions || this.defaultPositions)
        .withPush(this.popupPush)
        .withLockedPosition(this.popupLockScroll);

      const ref = this.overlay.create({
        positionStrategy,
        panelClass: this.popupPanelClass,
        hasBackdrop: this.popupHasBackdrop,
      });
      this.overlayRef = ref;
      ref.attach(new TemplatePortal(this.popupTemplateRef()!, this.viewContainerRef));

      ref.overlayElement.addEventListener('mouseenter', this.onMouseEnterOverlayBound);
      ref.overlayElement.addEventListener('mouseleave', this.onMouseLeaveOverlayBound);
      this.document.addEventListener('click', this.handleDocumentClickBound, true);
      this.document.addEventListener('keydown', this.handleKeydownBound);

      if (this.popupHasBackdrop) {
        this._backdropClickSubscription = ref.backdropClick().subscribe(() => {
          if (this.has('close', 'backdropClick') || this.has('forceClose', 'backdropClick')) {
            this.hide(this.has('forceClose', 'backdropClick'));
          }
        });
      }

      this.popupIsOpen.set(true);
      this.onPopupOpened.emit();
    });
  }

  public hide(force?: boolean) {
    // Cancel any existing timer subscriptions
    this._openOverlaySubscription?.unsubscribe();
    this._closeOverlaySubscription?.unsubscribe();

    this._closeOverlaySubscription = timer(
      force ? 0 : this.popupCloseTimeout,
    ).subscribe(() => {
      if (this.overlayRef && (force || !this.isMouseOverOverlay)) {
        this.#close();
      }
    });
  }

  /** Disposes the overlay and removes every listener it added. */
  #close(): void {
    const ref = this.overlayRef;
    this.overlayRef = undefined;
    this.isMouseOverOverlay = false;
    this._backdropClickSubscription?.unsubscribe();
    this.document.removeEventListener('click', this.handleDocumentClickBound, true);
    this.document.removeEventListener('keydown', this.handleKeydownBound);
    if (!ref) return;
    ref.overlayElement.removeEventListener('mouseenter', this.onMouseEnterOverlayBound);
    ref.overlayElement.removeEventListener('mouseleave', this.onMouseLeaveOverlayBound);
    ref.dispose();
    this.popupIsOpen.set(false);
    this.onPopupClosed.emit();
  }

  constructor() {
    // Follows `popupIsOpen` when the host sets it, so a popup can open without a trigger event.
    effect(() => {
      const wanted = this.popupIsOpen();
      untracked(() => {
        if (wanted && !this.overlayRef) this.show(true);
        else if (!wanted && this.overlayRef) this.hide(true);
      });
    });
  }

  ngOnInit(): void {
    this.popupId = this.popupId || Math.random().toString(36);
    this.popupService.registerPopup(this.popupId, this);
  }

  ngOnDestroy(): void {
    this._openOverlaySubscription?.unsubscribe();
    this._closeOverlaySubscription?.unsubscribe();
    this.#close();
    this.popupService.unregisterPopup(this.popupId!);
  }
}

@Injectable({
  providedIn: 'root',
})
export class PopupService {
  public readonly popups: Map<string, PopupDirective> = new Map();

  constructor() {}

  public registerPopup(id: string, popup: PopupDirective) {
    const existingPopup = this.popups.get(id);
    if (existingPopup) {
      throw new Error(`Popup with id '${id}' already exists`);
    }

    this.popups.set(id, popup);
  }

  public unregisterPopup(id: string) {
    this.popups.delete(id);
  }

  public hidePopupById(id: string) {
    const popup = this.popups.get(id);
    popup?.hide();
  }

  public showPopupById(id: string) {
    const popup = this.popups.get(id);
    popup?.show();
  }

  public hideAllPopups({ except }: { except?: string } = {}) {
    this.popups.forEach((popup) => {
      if (popup.popupId !== except) {
        popup.hide();
      }
    });
  }
}
