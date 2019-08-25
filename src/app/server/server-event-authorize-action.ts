import {  RunOnServer } from "radweb";
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @RunOnServer({ allowed: Roles.admin })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


