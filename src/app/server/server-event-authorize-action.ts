import {  RunOnServer } from "radweb";
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @RunOnServer({ allowed: c => c.hasRole(Roles.deliveryAdmin) })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


