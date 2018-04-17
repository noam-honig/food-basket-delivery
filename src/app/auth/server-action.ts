import { Action } from "radweb";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { evilStatics } from "./evil-statics";

export abstract class ServerAction<inParam, outParam> extends Action<inParam, outParam,myAuthInfo>{
    constructor(url?: string) {
        super(environment.serverUrl, url, evilStatics.auth.AddAuthInfoToRequest());
    }
}