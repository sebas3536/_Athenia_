/* eslint-disable @angular-eslint/prefer-inject */
// src/app/features/convocatorias/components/convocatoria-card/convocatoria-card.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Convocatoria, ConvocatoriaProgress, DeadlineStatus } from 'src/app/domain/models/convocatorias.model';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { DeadlineService } from '../../services/deadline.service';
import { ProgressUtilsService } from '../../utils/progress.utils';

@Component({
  selector: 'app-convocatoria-card',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
  ],
  templateUrl: './convocatoria-card.component.html',
  styleUrls: ['./convocatoria-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvocatoriaCardComponent {
  @Input({ required: true }) convocatoria!: Convocatoria;
  @Input() isAdmin = false;
  @Output() selectConvocatoria = new EventEmitter<string>();

  constructor(
    public utils: ConvocatoriasUtilsService,
    public deadlineService: DeadlineService,
    public progressUtils: ProgressUtilsService
  ) { }

  get progress(): ConvocatoriaProgress {
    return this.progressUtils.calculateProgress(this.convocatoria);
  }

  get isCompleted(): boolean {
    return this.progressUtils.isConvocatoriaComplete(this.convocatoria);
  }

  get formattedDate(): string {
    return this.utils.formatDateOnly(this.convocatoria.createdAt);
  }

  get deadlineStatus(): DeadlineStatus {
    return this.deadlineService.getDeadlineStatus(this.convocatoria.endDate);
  }

  get deadlineText(): string {
    return this.deadlineService.getDeadlineText(this.convocatoria.endDate);
  }

  get deadlineColor(): string {
    return this.deadlineService.getDeadlineColor(this.deadlineStatus);
  }

  get deadlineIndicator(): string {
    return this.deadlineService.getDeadlineIndicator(this.deadlineStatus);
  }

  onClick(): void {
    console.log('Card clicked, emitiendo ID:', this.convocatoria.id);
    this.selectConvocatoria.emit(this.convocatoria.id);
  }
}