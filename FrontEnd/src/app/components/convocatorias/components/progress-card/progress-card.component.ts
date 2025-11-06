/* eslint-disable @angular-eslint/prefer-inject */
// src/app/features/convocatorias/components/progress-card/progress-card.component.ts
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Convocatoria } from 'src/app/domain/models/convocatorias.model';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { DeadlineIndicatorComponent } from "../deadline-indicator/deadline-indicator.component";
import { ProgressUtilsService } from '../../utils/progress.utils';

@Component({
  selector: 'app-progress-card',
  standalone: true,
  imports: [CommonModule, DeadlineIndicatorComponent],
  templateUrl: './progress-card.component.html',
  styleUrl: './progress-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressCardComponent {
  @Input({ required: true }) convocatoria!: Convocatoria;
  @Input() progress!: { completed: number; total: number; percentage: number };
  @Input() isCompleted!: boolean;
  constructor(
    public utils: ConvocatoriasUtilsService,
    public progressUtils: ProgressUtilsService
  ) { }

}