import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, input, signal, ViewEncapsulation } from '@angular/core';
import { ZardAccordionComponent } from './accordion.component';

import type { ClassValue } from 'clsx';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-z-accordion-item',
  exportAs: 'zAccordionItem',
  standalone: true,
  imports: [LucideAngularModule], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'block w-full text-left', 
  },
  template: `
    <div
  class="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
>
  <button
    type="button"
    role="button"
    [id]="'accordion-' + zValue()"
    class="group flex w-full items-center justify-between px-4 py-4 text-left text-base font-medium text-gray-800 focus:outline-none"
    [class]="class()"
    (click)="toggle()"
    (keydown.enter)="toggle()"
    (keydown.space)="toggle()"
    [attr.aria-expanded]="isOpen()"
    [attr.aria-controls]="'content-' + zValue()"
    tabindex="0"
  >
    <span class="text-[15px] font-medium tracking-tight group-hover:text-[#02ab74] transition-colors">
      {{ zTitle() }}
    </span>
    <lucide-angular
      name="ChevronDown"
      class="w-5 h-5 text-gray-400 transition-transform duration-300 ease-in-out"
      [class.rotate-180]="isOpen()"
    />
  </button>

  <div
    class="grid transition-all duration-300 ease-in-out px-4"
    [class.grid-rows-[1fr]]="isOpen()"
    [class.grid-rows-[0fr]]="!isOpen()"
    [id]="'content-' + zValue()"
    [attr.data-state]="isOpen() ? 'open' : 'closed'"
    role="region"
    [attr.aria-labelledby]="'accordion-' + zValue()"
  >
    <div class="overflow-hidden">
      <main class="pb-4 text-[15px] text-gray-600 leading-relaxed">
        <ng-content></ng-content>
      </main>
    </div>
  </div>
</div>

  `,
})
export class ZardAccordionItemComponent {
  private cdr = inject(ChangeDetectorRef);

  readonly zTitle = input<string>('');
  readonly zValue = input<string>('');
  readonly class = input<ClassValue>('');

  private isOpenSignal = signal(false);

  accordion?: ZardAccordionComponent;

  isOpen = computed(() => this.isOpenSignal());

  setOpen(open: boolean): void {
    this.isOpenSignal.set(open);
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this.accordion) {
      this.accordion.toggleItem(this);
    } else {
      this.setOpen(!this.isOpen());
    }
  }
}