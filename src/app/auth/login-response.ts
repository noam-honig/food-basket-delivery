export interface LoginResponse {
    authToken?: string;
    valid: boolean;
    requirePassword:boolean;
}