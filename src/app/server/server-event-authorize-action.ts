import { ServerAction, RunOnServer } from "../auth/server-action";

export class ServerEventAuthorizeAction {

    @RunOnServer({ allowed: c => c.isAdmin() })
    static DoAthorize(key: string) {
        ServerEventAuthorizeAction.authorize(key);
    }

    static authorize: (key: string) => void = (key: string) => { };
}


