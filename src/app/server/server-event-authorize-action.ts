import {  ServerFunction } from "radweb";
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @ServerFunction({ allowed: Roles.admin })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


