import {  ServerFunction } from '@remult/core';
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @ServerFunction({ allowed: Roles.admin })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


