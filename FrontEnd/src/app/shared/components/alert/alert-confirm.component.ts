import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@shared/utils/merge-classes';
import { alertVariants, ZardAlertVariants } from './alert.variants';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-z-alert-confirm',
  standalone: true,
  exportAs: 'zAlertConfirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    LucideAngularModule,
    CommonModule,
  ],
  template: `
    @if (iconName()) {
      <lucide-icon [name]="iconName()" class="w-4 h-4 shrink-0" />
    }

    <div class="flex flex-col gap-2 w-full min-w-0 pr-5">
      <div class="flex flex-col gap-0.5">
        <h5 class="text-sm font-medium leading-tight tracking-tight">
          {{ zTitle() }}
        </h5>
        @if (zDescription()) {
          <span class="text-xs leading-relaxed opacity-90">{{ zDescription() }}</span>
        }
      </div>

      <div class="flex gap-2 mt-1">
        <button
          (click)="onConfirm()"
          class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
          [ngClass]="confirmButtonClasses()"
          type="button"
        >
          {{ zConfirmText() }}
        </button>
        <button
          (click)="onCancel()"
          class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
          [ngClass]="cancelButtonClasses()"
          type="button"
        >
          {{ zCancelText() }}
        </button>
      </div>
    </div>
  `,
  host: {
    '[class]': 'classes()',
    '[attr.data-type]': 'zType()',
    '[attr.data-appearance]': 'zAppearance()',
  },
})
export class ZardAlertConfirmComponent {
  readonly class = input<ClassValue>('');
  readonly zTitle = input.required<string>();
  readonly zDescription = input<string>('');
  readonly zIcon = input<keyof typeof this.iconsType>();
  readonly zType = input<ZardAlertVariants['zType']>('confirm');
  readonly zAppearance = input<ZardAlertVariants['zAppearance']>('fill');
  readonly zConfirmText = input<string>('Confirmar');
  readonly zCancelText = input<string>('Cancelar');

  readonly confirmed = output<boolean>();

  protected readonly classes = computed(() =>
    mergeClasses(
      alertVariants({
        zType: this.zType(),
        zAppearance: this.zAppearance(),
      }),
      this.class()
    )
  );

  protected readonly iconsType: Record<
    NonNullable<ZardAlertVariants['zType']>,
    keyof typeof import('../../../icon/icons').LucideIcons 
  > = {
    default: 'Info',
    info: 'Info',
    success: 'CheckCircle2',
    warning: 'AlertTriangle',
    error: 'XCircle',
    confirm: 'AlertCircle',
  };

  protected readonly iconName = computed(() => {
    return this.zIcon() ?? this.iconsType[this.zType() ?? 'confirm'];
  });

  protected readonly confirmButtonClasses = computed(() => {
  const type = this.zType();
  const baseClasses = 'hover:opacity-90 active:scale-95 transition-colors';

  switch (type) {
    case 'error':
      return `bg-[#ff9ea1] text-white ${baseClasses}`;
    case 'warning':
      return `bg-yellow-600 text-white ${baseClasses}`;
    case 'success':
      return `bg-[#48cb89] text-white ${baseClasses}`;
    case 'info':
      return `bg-blue-500 text-white ${baseClasses}`;
    case 'confirm': 
      return `bg-[#8A38F5] text-white hover:bg-[#9333ea] ${baseClasses}`;
    default:
      return `bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 ${baseClasses}`;
  }
});


  protected readonly cancelButtonClasses = computed(() => {
  return 'bg-[#8A38F5] border-0 text-white hover:brightness-90 active:scale-95 transition';
});


  protected onConfirm(): void {
    this.confirmed.emit(true);
  }

  protected onCancel(): void {
    this.confirmed.emit(false);
  }
}