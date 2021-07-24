import { BackendMethod, Context } from 'remult';
import { Roles } from "../auth/roles";

export class ServerEventAuthorizeAction {

    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static DoAthorize(key: string,context?:Context) {
        ServerEventAuthorizeAction.authorize(key,context);
    }

    static authorize: (key: string,context:Context) => void = (key: string) => { };
}


