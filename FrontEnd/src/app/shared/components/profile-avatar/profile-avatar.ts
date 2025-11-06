/* eslint-disable @angular-eslint/prefer-inject */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserInfoResponse } from 'src/app/domain/models/user.model';
import { UserPreferencesService } from 'src/app/services/api/user-preferences.service';
import { UserService } from 'src/app/services/api/user-service';
import { AlertService } from '../alert/alert.service';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-profile-avatar',
  imports: [CommonModule],
  templateUrl: './profile-avatar.html',
  styleUrls: ['./profile-avatar.css']
})
export class ProfileAvatar implements OnInit, OnDestroy {
  @Input() size = 20;
  @Input() showEditControls = false;
  @Input() photoPreview?: string;
  
  
  @Input() userData!: UserInfoResponse;
  @Input() userPhotoUrl?: string | null;

  private destroy$ = new Subject<void>();

  profilePhotoUrl: string | null = null;
  user: UserInfoResponse | null = null;
  selectedFile: File | null = null;
  uploadingPhoto = false;

  constructor(
    private preferencesService: UserPreferencesService,
    private userService: UserService,
    private alertService: AlertService,
    @Inject(DOCUMENT) public document: Document 
  ) {}

  ngOnInit(): void {
    if (this.userData) {
      this.user = this.userData;
      this.profilePhotoUrl = this.userPhotoUrl || null;
    } else {
      this.loadUser();
      this.subscribeToPreferences();
    }
  }
  

  private loadUser(): void {
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
        },
        error: (error) => console.error('Error loading user:', error)
      });
  }

  private subscribeToPreferences(): void {
    this.preferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prefs) => {
          if (prefs) {
            this.profilePhotoUrl = prefs.profile_photo_url || null;
          }
        },
        error: (error) => console.error('Error subscribing to preferences:', error)
      });

    this.preferencesService.getUserPreferences()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  getUserInitials(): string {
    if (!this.user?.name) return '??';
    const names = this.user.name.split(' ');
    return names.length >= 2 
      ? (names[0][0] + names[1][0]).toUpperCase() 
      : this.user.name.substring(0, 2).toUpperCase();
  }

  get profilePhoto(): string {
    
    if (this.userData && this.userPhotoUrl) {
      return this.userPhotoUrl;
    }
    
    if (this.photoPreview) {
      return this.photoPreview;
    }
    
    return this.preferencesService.getProfilePhotoUrl(this.photoPreview);
  }

  onFileSelected(event: Event): void {
    if (!this.showEditControls) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validation = this.preferencesService.validateImageFile(file);
      if (!validation.valid) {
        this.alertService.error('Archivo inválido', validation.error || '');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto(): void {
    if (!this.showEditControls || !this.selectedFile) return;
    this.uploadingPhoto = true;
    this.preferencesService.uploadProfilePhoto(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.profilePhotoUrl = response.photo_url || null;
          this.photoPreview = undefined;
          this.selectedFile = null;
          this.alertService.success('Foto de perfil actualizada', '');
          this.uploadingPhoto = false;
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          this.alertService.error('Error al subir foto', '');
          this.uploadingPhoto = false;
        }
      });
  }

  cancelPhotoSelection(): void {
    if (!this.showEditControls) return;
    this.selectedFile = null;
    this.photoPreview = undefined;
  }

  deletePhoto(): void {
    if (!this.showEditControls) return;
    this.alertService.confirm('Confirmar eliminación', '¿Estás seguro de eliminar tu foto de perfil?')
      .then((confirmed) => {
        if (!confirmed) return;
        this.preferencesService.deleteProfilePhoto()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.profilePhotoUrl = null;
              this.alertService.success('Foto de perfil eliminada', '');
            },
            error: (error) => {
              console.error('Error deleting photo:', error);
              this.alertService.error('Error al eliminar foto', '');
            }
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}