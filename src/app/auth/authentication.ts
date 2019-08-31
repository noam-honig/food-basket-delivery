import { DataApiRequest, DataApiServer } from "radweb";

import { LoginResponse } from './auth-info';
import { Action } from "radweb";
import { environment } from "../../environments/environment";
import { SiteArea } from "radweb-server";
//import * as jwt from 'jsonwebtoken';
import { myAuthInfo } from "./my-auth-info";
//import { JwtHelperService } from '@auth0/angular-jwt';


const authToken = 'auth-token';

export class Authentication<T> {

    constructor() {
        this.setEmptyInfo();
      
    }
    initForBrowser(jwt: JsonWebTokenHelper){
        this.jwt = jwt;
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
                console.error(err);
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
        this._info = this.jwt.decode(token) as T;// new JwtHelperService().decodeToken(token) as T;//  jwt.decode(token) as T;
        if (this._info) {
            this.valid = true;
            this._token = token;
            this.__theInfo = Promise.resolve(this._info);
        }
        if (this.tokenInfoChanged)
            this.tokenInfoChanged();
    }
    setEmptyInfo() {
        this.valid = false;
        this._token = '';
        this._info = undefined;
        if (this.tokenInfoChanged)
            this.tokenInfoChanged();

    }
    tokenInfoChanged: () => void;
    private _token: string;
    valid: boolean = false;
    private _info: T;

    signout() {
        this.setEmptyInfo();
        if (typeof (Storage) !== 'undefined') {
            sessionStorage.removeItem(authToken);
            localStorage.removeItem(authToken);
        }
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


    applyTo(server: DataApiServer<T>, area: SiteArea<T>,jwt:JsonWebTokenHelper): void {
        this.jwt = jwt;
        server.addRequestProcessor(async req => {
            var h = req.getHeader(authToken);

            if (this.validateToken)
                req.authInfo = await this.validateToken(h);
            return true;
        })
        server.addAllowedHeader(authToken);
        area.addAction(new GetCurrentSession(environment.serverUrl,undefined, this.AddAuthInfoToRequest()));

    }
    jwt:JsonWebTokenHelper;
    validateToken: (token: string) => Promise<T> = async (x) => {
        let result: T;
        try {
            result = <T><any>this.jwt.verify(x, this.tokenSignKey);
        } catch (err) { }

        return result;
    };
    createTokenFor(item: T) {
        return this.jwt.sign(<any>item, this.tokenSignKey);
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
export interface JsonWebTokenHelper{
    decode(token: string): any;
    verify(token:string,key:string):any;
    sign(item:any,key:string):string;
}
export class GetCurrentSession<T extends myAuthInfo> extends Action<any, T, T>{

    protected async execute(info: any, context: DataApiRequest<T>): Promise<T> {
        return context.authInfo;
    }
}

