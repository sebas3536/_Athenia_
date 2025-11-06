import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@shared/utils/merge-classes';
import { alertVariants, ZardAlertVariants } from './alert.variants';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-z-alert',
  standalone: true,
  exportAs: 'zAlert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    LucideAngularModule,
  ],
  template: `
    @if (iconName()) {
      <lucide-icon [name]="iconName()" class="w-4 h-4 shrink-0" />
    }

    <div class="flex flex-col gap-0.5 w-full min-w-0 pr-5">
      <h5 class="text-sm font-medium leading-tight tracking-tight">
        {{ zTitle() }}
      </h5>
      @if (zDescription()) {
        <span class="text-xs leading-relaxed opacity-90">{{ zDescription() }}</span>
      }
    </div>
  `,
  host: {
    '[class]': 'classes()',
    '[attr.data-type]': 'zType()',
    '[attr.data-appearance]': 'zAppearance()',
  },
})
export class ZardAlertComponent {
  readonly class = input<ClassValue>('');
  readonly zTitle = input.required<string>();
  readonly zDescription = input<string>('');
  readonly zIcon = input<keyof typeof this.iconsType>();
  readonly zType = input<ZardAlertVariants['zType']>('default');
  readonly zAppearance = input<ZardAlertVariants['zAppearance']>('outline');

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
    confirm: 'CheckCircle2',
  };

  protected readonly iconName = computed(() => {
    return this.zIcon() ?? this.iconsType[this.zType() ?? 'default'];
  });
}