/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardAlertComponent } from './alert.component';
import { ZardAlertConfirmComponent } from './alert-confirm.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { AlertConfig, AlertService } from './alert.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-alert-container',
  standalone: true,
  imports: [CommonModule, ZardAlertComponent, ZardAlertConfirmComponent, LucideAngularModule],
  template: `
    <div class="alert-container-wrapper">
      <div class="alert-stack"
           [class.is-expanded]="isExpanded"
           (mouseenter)="onMouseEnter()"
           (mouseleave)="onMouseLeave()">
        <ng-container *ngFor="let alert of alerts; let i = index; trackBy: trackById">
          <div class="alert-wrapper"
               [@alertAnimation]
               [style.z-index]="alerts.length - i"
               [style.transform]="getStackTransform(i)"
               [class.is-stacked]="!isExpanded && i > 0">
            <div class="alert-item">
              @if (alert.type === 'confirm') {
                <app-z-alert-confirm
                  [zTitle]="alert.title"
                  [zDescription]="alert.description"
                  [zType]="alert.type"
                  [zAppearance]="alert.appearance || 'fill'"
                  (confirmed)="onConfirmResponse(alert, $event)"
                ></app-z-alert-confirm>
              } @else {
                <app-z-alert
                  [zTitle]="alert.title"
                  [zDescription]="alert.description"
                  [zType]="alert.type"
                  [zAppearance]="alert.appearance || 'fill'"
                ></app-z-alert>
                <button
                  class="alert-close-btn"
                  (click)="dismiss(alert.id)"
                  aria-label="Cerrar alerta"
                  type="button"
                >
                </button>
              }
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .alert-container-wrapper {
      position: fixed;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      width: auto;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }

    .alert-stack {
      position: relative;
      display: flex;
      flex-direction: column;
      width: auto;
      padding: 0;
      pointer-events: auto;
    }

    .alert-wrapper {
      position: absolute;
      top: 0;
      left: 50%;
      width: auto;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .alert-wrapper.is-stacked {
      pointer-events: none;
    }

    .alert-stack.is-expanded .alert-wrapper.is-stacked {
      pointer-events: auto;
    }

    .alert-item {
      position: relative;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      border-radius: 0.375rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      min-width: 320px;
      max-width: 500px;
      overflow: hidden;
    }

    .alert-stack:not(.is-expanded) .alert-wrapper:not(:first-child) .alert-item {
      opacity: 0.6;
      filter: brightness(0.9);
    }

    .alert-stack:hover .alert-item {
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    .alert-close-btn {
      position: absolute;
      top: 0.875rem;
      right: 0.875rem;
      width: 1rem;
      height: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 0.125rem;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s ease;
      color: currentColor;
      padding: 0;
      z-index: 10;
    }

    .alert-close-btn:hover {
      opacity: 1;
    }

    .alert-close-btn:focus-visible {
      outline: 1px solid currentColor;
      outline-offset: 2px;
      opacity: 1;
    }

    @media (max-width: 640px) {
      .alert-container-wrapper {
        padding-top: 0.5rem;
      }

      .alert-stack {
        padding: 0 0.5rem;
      }

      .alert-item {
        min-width: 280px;
        max-width: calc(100vw - 1rem);
      }
    }
  `],
  animations: [
    trigger('alertAnimation', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateX(-50%) translateY(-20px)',
        }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({
          opacity: 1,
          transform: 'translateX(-50%) translateY(0)',
        }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.6, 1)', style({
          opacity: 0,
          transform: 'translateX(-50%) translateY(-20px)',
        }))
      ])
    ])
  ]
})
export class AlertContainerComponent implements OnInit {
  alerts: AlertConfig[] = [];
  isExpanded = false;
  private readonly MAX_VISIBLE_ALERTS = 3;
  private readonly STACK_OFFSET = 8;
  private readonly STACK_SCALE = 0.98;

  constructor(private alertService: AlertService) { }

  ngOnInit(): void {
    this.alertService.alerts$.subscribe((alerts: AlertConfig[]) => {
      this.alerts = alerts.slice(0, this.MAX_VISIBLE_ALERTS);
    });
  }

  dismiss(id: string): void {
    this.alertService.dismiss(id);
  }

  onConfirmResponse(alert: AlertConfig, confirmed: boolean): void {
    if (alert.confirmCallback) {
      alert.confirmCallback(confirmed);
    }
  }

  onMouseEnter(): void {
    if (this.alerts.length > 1) {
      this.isExpanded = true;
    }
  }

  onMouseLeave(): void {
    this.isExpanded = false;
  }

  getStackTransform(index: number): string {
    const center = 'translateX(-50%)';
    if (this.isExpanded) {
      const spacing = 60;
      return `${center} translateY(${index * spacing}px)`;
    } else {
      if (index === 0) {
        return `${center} translateY(0) scale(1)`;
      }
      const offset = index * this.STACK_OFFSET;
      const scale = Math.pow(this.STACK_SCALE, index);
      return `${center} translateY(${offset}px) scale(${scale})`;
    }
  }

  trackById(index: number, alert: AlertConfig): string {
    return alert.id;
  }
}