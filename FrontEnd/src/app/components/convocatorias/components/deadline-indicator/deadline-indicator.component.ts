/* eslint-disable @angular-eslint/prefer-inject */
// src/app/features/convocatorias/components/deadline-indicator/deadline-indicator.component.ts

import { Component, Input } from '@angular/core';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { Convocatoria } from 'src/app/domain/models/convocatorias.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deadline-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deadline-indicator.component.html',
  styleUrls: ['./deadline-indicator.component.css']
})
export class DeadlineIndicatorComponent {
  @Input() convocatoria!: Convocatoria;

  constructor(private utils: ConvocatoriasUtilsService) {}

  formatDateOnly(date: Date | string | null | undefined): string {
    return this.utils.formatDateOnly(date);
  }

  getDeadlineStatus(endDate: Date | string | null | undefined): 'safe' | 'warning' | 'critical' | 'overdue' {
    return this.utils.getDeadlineStatus(endDate);
  }

  getDeadlineText(endDate: Date | string | null | undefined): string {
    return this.utils.getDeadlineText(endDate);
  }
}