import { DataApiRequest, DataApiServer } from "radweb/utils/dataInterfaces";

import { AuthInfo } from './auth-info';
import { Action } from "radweb";
import { environment } from "../../environments/environment";
import { SiteArea } from "radweb/utils/server/expressBridge";
import * as atob from 'atob';


const authToken = 'auth-token';

export class Authentication<T extends AuthInfo> {

    constructor() {
        if (typeof (Storage) !== 'undefined') {
            try {
                let load = (what: string) => {
                    if (what && what != 'undefined') {

                        this._info = this.decodeInfo(what);
                        
                    }
                };
                load(sessionStorage.getItem(authToken));
                if (!this._info)
                    load(localStorage.getItem(authToken));
            }
            catch (err) {
                console.log(err);
            }
            if (!this._info)
                this._info = this.emptyInfo();
        }
    }
    private _info: T;
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
                this.encodeInfo()
            );
        this.__theInfo = Promise.resolve(this._info);
    }
    rememberOnThisMachine() {
        if (typeof (Storage) !== 'undefined')
            localStorage.setItem(authToken,
                this.encodeInfo()
            );
    }
    AddAuthInfoToRequest() {
        return (add: ((name: string, value: string) => void)) => {
            if (this.info)
                add(authToken, this.encodeInfo());
        }
    }
    private encodeInfo() {


        return btoa(encodeURIComponent((JSON.stringify(this.info)).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(+('0x' + p1));
            })));
    }
     
    private decodeInfo(token: string): T {
        return JSON.parse(decodeURIComponent( atob(token).split('').map(function (c) {
            return c;
        }).join('')));
    }

    applyTo(server: DataApiServer<T>, area: SiteArea<T>): void {
        server.addRequestProcessor(async req => {
            var h = req.getHeader(authToken);
            
            if (this.validateToken)
                req.authInfo = await this.validateToken(h);
            return true;
        })
        server.addAllowedHeader(authToken);
        area.addAction(new GetCurrentSession(environment.serverUrl, undefined, this.AddAuthInfoToRequest()));

    }
    validateToken: (token: string) => Promise<T> = async (x) =>{
        
         let result =  this.decodeInfo(x);
         
         return result;
        };

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

