import { BackendMethod, Remult } from 'remult';
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static DoAthorize(key: string,context?:Remult) {
        ServerEventAuthorizeAction.authorize(key,context);
    }

    static authorize: (key: string,context:Remult) => void = (key: string) => { };
}


