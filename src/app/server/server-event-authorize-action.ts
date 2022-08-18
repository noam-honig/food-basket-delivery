import { BackendMethod } from 'remult';
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


