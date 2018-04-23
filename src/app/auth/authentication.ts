import { DataApiRequest, DataApiServer } from "radweb/utils/dataInterfaces";

import { LoginResponse } from './auth-info';
import { Action } from "radweb";
import { environment } from "../../environments/environment";
import { SiteArea } from "radweb/utils/server/expressBridge";
import * as atob from 'atob';
import * as jwt from 'jsonwebtoken';
import { myAuthInfo } from "./my-auth-info";



const authToken = 'auth-token';

export class Authentication<T> {

    constructor() {
        this.setEmptyInfo();
        if (typeof (Storage) !== 'undefined') {
            try {
                let load = (what: string) => {
                    if (what && what != 'undefined') {

                        this.setToken(what);

                    }
                };
                load(sessionStorage.getItem(authToken));
                if (!this._info)
                    load(localStorage.getItem(authToken));
            }
            catch (err) {
                console.log(err);
            }
        }
    }
    loggedIn(info: LoginResponse, remember: boolean) {
        if (info.valid) {
            this.setToken(info.authToken);
            if (typeof (Storage) !== 'undefined') {
                sessionStorage.setItem(authToken, this._token);
                if (remember)
                    localStorage.setItem(authToken, this._token);
            }
        }
        else {
            this.setEmptyInfo();
        }
    }
    private setToken(token: string) {
        this._info = jwt.decode(token) as T;
        if (this._info) {
            this.valid = true;
            this._token = token;
            this.__theInfo = Promise.resolve(this._info);
        }
    }
    setEmptyInfo() {
        this.valid = false;
        this._token = '';
        this._info = undefined;

    }
    private _token: string;
    valid: boolean = false;
    private _info: T;

    signout() {
        this.setEmptyInfo();
        if (typeof (Storage) !== 'undefined')
            sessionStorage.removeItem(authToken);
    }
    get info() {
        if (!this.valid)
            return undefined;
        return this._info;
    }


    AddAuthInfoToRequest() {
        return (add: ((name: string, value: string) => void)) => {
            if (this.info)
                add(authToken, this._token);
        }
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
    validateToken: (token: string) => Promise<T> = async (x) => {
        let result: T;
        try {
            result = jwt.verify(x, this.tokenSignKey) as T;
        } catch{ }

        return result;
    };
    createTokenFor(item: T) {
        return jwt.sign(item, this.tokenSignKey);
    }
    tokenSignKey;

    private __theInfo: Promise<T>;
    async getAuthInfoAsync(): Promise<T> {
        if (!this.__theInfo) {

            this.__theInfo = new GetCurrentSession(environment.serverUrl, undefined, this.AddAuthInfoToRequest()).run(undefined).then(x => {
                this._info = x as T;
                return this.info;
            });
        }
        return this.__theInfo;
    }



}
export class GetCurrentSession<T extends myAuthInfo> extends Action<any, T, T>{

    protected async execute(info: any, context: DataApiRequest<T>): Promise<T> {
        return context.authInfo;
    }
}

