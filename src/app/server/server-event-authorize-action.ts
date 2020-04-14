import {  ServerFunction, Context } from '@remult/core';
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static DoAthorize(key: string,context?:Context) {
        ServerEventAuthorizeAction.authorize(key,context);
    }

    static authorize: (key: string,context:Context) => void = (key: string) => { };
}


