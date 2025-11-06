export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetVerify {
    token: string;
}

export interface PasswordResetConfirm {
    token: string;
    new_password: string;
}

export interface PasswordResetResponse {
    message: string;
}

export interface TokenValidationResponse {
    valid: boolean;
    message: string;
}