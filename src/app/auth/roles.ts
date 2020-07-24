import { SignedInGuard, Context } from '@remult/core';
import { Injectable } from "@angular/core";
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Sites } from '../sites/sites';


export class Roles {
    static admin = 'deliveryAdmin';
    static distCenterAdmin = 'distCenterAdmin';
    static overview = 'overview';
}


@Injectable()
export class AdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.admin;
    }
}
@Injectable()
export class distCenterAdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.distCenterAdmin;
    }
}
@Injectable()
export class distCenterOrOverviewOrAdmin extends SignedInGuard {

    isAllowed() {
        return this.context.isAllowed([Roles.distCenterAdmin, Roles.admin, Roles.overview]);
    }
}

@Injectable()
export class OverviewGuard extends SignedInGuard {

    isAllowed() {
        return Roles.overview;
    }
}

@Injectable()
export class MltOnly implements CanActivate {
    constructor(private context: Context) {

    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | import("@angular/router").UrlTree | import("rxjs").Observable<boolean | import("@angular/router").UrlTree> | Promise<boolean | import("@angular/router").UrlTree> {
        let site = Sites.getOrganizationFromContext(this.context);
        console.log(site,this.context.getPathInUrl());
        if (site == 'mlt')
            return true;
        return false;
    }


}



@Injectable()
export class OverviewOrAdminGuard extends SignedInGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.overview);
    }
}