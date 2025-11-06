/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from "lucide-angular";
import { ProfileAvatar } from "@shared/components/profile-avatar/profile-avatar";

@Component({
  selector: 'app-collaborators-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ProfileAvatar],
  templateUrl: './collaborators-section.component.html'
})
export class CollaboratorsSectionComponent {
  @Input() collaborators: any[] = [];
  @Input() isAdmin = false;
  @Output() addCollaborator = new EventEmitter<void>();
  @Output() removeCollaborator = new EventEmitter<string>();

  constructor(public utils: ConvocatoriasUtilsService) { }
}