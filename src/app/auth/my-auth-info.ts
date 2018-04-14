import { AuthInfo } from "./auth-info";

export interface myAuthInfo extends AuthInfo {
    name?: string;
    id?: string;
    admin?: boolean;
}