import { AuthInfo } from "./auth-info";

export interface myAuthInfo extends AuthInfo {
    name?: string;
    helperId?: string;
    admin?: boolean;
}