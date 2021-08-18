import { AuthenticatedInGuard, NotSignedInGuard } from '@remult/angular';
import { Remult } from 'remult';
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';



export class Roles {
    static admin = 'deliveryAdmin';
    static distCenterAdmin = 'distCenterAdmin';
    static overview = 'overview';
    static lab = 'lab';
    static indie = 'indie'
}


@Injectable()
export class AdminGuard extends AuthenticatedInGuard {

    isAllowed() {
        return Roles.admin;
    }
}
@Injectable()
export class distCenterAdminGuard extends AuthenticatedInGuard {

    isAllowed() {
        return Roles.distCenterAdmin;
    }
}
@Injectable()
export class distCenterOrOverviewOrAdmin extends AuthenticatedInGuard {

    isAllowed() {
        return this.context.isAllowed([Roles.distCenterAdmin, Roles.admin, Roles.overview]);
    }
}

@Injectable()
export class OverviewGuard extends AuthenticatedInGuard {

    isAllowed() {
        return Roles.overview;
    }
}




@Injectable()
export class OverviewOrAdminGuard extends AuthenticatedInGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.overview);
    }
}
@Injectable()
export class SignedInAndNotOverviewGuard extends AuthenticatedInGuard {

    isAllowed() {
        return c => c.authenticated() && !c.isAllowed(Roles.overview)
    }
}

@Injectable()
export class IndieGuard extends AuthenticatedInGuard {
    isAllowed() {
        return Roles.indie;
    }
}
@Injectable()
export class LabGuard extends AuthenticatedInGuard {
    isAllowed() {
        return Roles.lab;
    }
}

@Injectable()
export class distCenterOrLabGuard extends AuthenticatedInGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.lab) || c.isAllowed(Roles.distCenterAdmin);
    }
}

@Injectable()
export class EventListGuard implements CanActivate {
    constructor(private context: Remult) { }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return !this.context.authenticated() || !this.context.isAllowed(Roles.distCenterAdmin)
    }


}
