import { DataApiRequest, DataApiServer } from "radweb/utils/dataInterfaces";

import { AuthInfo } from './auth-info';
import { Action } from "radweb";
import { environment } from "../../environments/environment";
import { SiteArea } from "radweb/utils/server/expressBridge";


const authToken = 'auth-token';

export class Authentication<T extends AuthInfo> {

    constructor() {
        if (typeof (Storage) !== 'undefined') {
            let load = (what:string)=>{
                if (what&&what!='undefined')
                    this._info = JSON.parse(what);
            };
            load(sessionStorage.getItem(authToken));
            if (!this._info)
                load(localStorage.getItem(authToken));
        }
    }
    private _info: T = this.emptyInfo();
    emptyInfo() {
        return {
            authToken: '',
            valid: false
        } as T;
    }
    signout() {
        this.info = this.emptyInfo();
    }
    get info() { return this._info; }
    set info(value: T) {
        this._info = value;
        if (typeof (Storage) !== 'undefined')
            sessionStorage.setItem(authToken,
                JSON.stringify(value)
            );
        this.__theInfo = Promise.resolve(this._info);
    }
    rememberOnThisMachine() {
        if (typeof (Storage) !== 'undefined')
            localStorage.setItem(authToken,
                JSON.stringify(this.info)
            );
    }
    AddAuthInfoToRequest() {
        return (add: ((name: string, value: string) => void)) => {
            if (this.info)
                add(authToken, this.info.authToken);
        }
    }

    applyTo(server: DataApiServer<T>, area: SiteArea<T>): void {
        server.addRequestProcessor(async req => {
            var h = req.getHeader(authToken);
            console.log('validate token ', h);
            if (this.validateToken)
                req.authInfo = await this.validateToken(h);
            return true;
        })
        server.addAllowedHeader(authToken);
        area.addAction(new GetCurrentSession(environment.serverUrl, undefined, this.AddAuthInfoToRequest()));

    }
    validateToken: (token: string) => Promise<T>;

    private __theInfo: Promise<T>;
    async getAuthInfoAsync(): Promise<T> {
        if (!this.__theInfo) {

            this.__theInfo = new GetCurrentSession(environment.serverUrl, undefined, this.AddAuthInfoToRequest()).run(undefined).then(x => {
                this.info = x as T;
                return this.info;
            });
        }
        return this.__theInfo;
    }



}
export class GetCurrentSession<T extends AuthInfo> extends Action<any, T, T>{

    protected async execute(info: any, context: DataApiRequest<T>): Promise<T> {
        return context.authInfo;
    }
}

