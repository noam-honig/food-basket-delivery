import { Injectable } from "@angular/core";
import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";

@Injectable()
export class AuthService {
    auth = new Authentication<myAuthInfo>();
}