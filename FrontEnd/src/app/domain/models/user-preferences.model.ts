

export enum LanguageEnum {
    ES = 'es',
    EN = 'en'
}

export enum ThemeEnum {
    LIGHT = 'light',
    DARK = 'dark',
    AUTO = 'auto'
}

export interface NotificationPreferencesUpdate {
    email_notifications?: boolean;
    push_notifications?: boolean;
    weekly_summary?: boolean;
    login_alerts?: boolean;
}

export interface InterfacePreferencesUpdate {
    language?: LanguageEnum;
    theme?: ThemeEnum;
}

export interface UserProfileUpdate {
    name?: string;
    email?: string;
}

export interface ProfilePhotoResponse {
    message: string;
    photo_url?: string;
}

export interface UserPreferencesResponse {
    email_notifications: boolean;
    push_notifications: boolean;
    weekly_summary: boolean;
    language: LanguageEnum;
    theme: ThemeEnum;
    profile_photo_url?: string;
    login_alerts: boolean;
    user_id: number;
    updated_at: string;
    convocatoria_enabled: boolean; 
}

export interface LanguageOption {
    code: LanguageEnum;
    label: string;
    flag: string;
}

export interface ThemeOption {
    code: ThemeEnum;
    label: string;
    icon: string;
}

export interface LoginAlertConfig {
    enabled: boolean;
    notify_on_new_device: boolean;
    notify_on_new_location: boolean;
    notify_on_suspicious_activity: boolean;
}

export interface LoginAlertInfo {
    device: string;
    location: string;
    ip_address: string;
    timestamp: string;
    is_suspicious: boolean;
}