/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DocumentItemComponent } from "../document-item/document-item.component";

@Component({
  selector: 'app-documents-checklist',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DocumentItemComponent],
  templateUrl: './documents-checklist.component.html',
  styleUrls: ['./documents-checklist.component.css']
})
export class DocumentsChecklistComponent {
  @Input() documents: any[] = [];
  @Input() isLoading = false;
  @Output() openAddDocument = new EventEmitter<void>();
  @Output() uploadFile = new EventEmitter<any>();
  @Output() downloadFile = new EventEmitter<any>();
  @Output() deleteDocument = new EventEmitter<any>();

  trackByFn = (index: number, item: any) => item.id;
}