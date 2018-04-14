import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Route } from '@angular/router';

import { myAuthInfo } from './my-auth-info';
import { Authentication } from './authentication';
import { AuthService } from './auth-service';

@Injectable()
export class LoggedInGuard implements CanActivate {
    constructor(private auth: AuthService) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        return this.auth.auth.info.valid;
    }
}
@Injectable()
export class NotLoggedInGuard implements CanActivate {
    constructor(private auth: AuthService) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        return !this.auth.auth.info.valid;
    }
}




@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private auth: AuthService) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        return this.auth.auth.info.valid && this.auth.auth.info.admin;
    }
}


