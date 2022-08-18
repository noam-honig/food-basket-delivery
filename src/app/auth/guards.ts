import { AuthenticatedGuard } from '@remult/angular';
import { remult } from 'remult';
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Roles } from './roles';
import { getSettings } from '../manage/ApplicationSettings';

@Injectable()
export class AdminGuard extends AuthenticatedGuard {

    isAllowed() {
        return Roles.admin;
    }
}

@Injectable()
export class FamilyAdminGuard extends AuthenticatedGuard {

    isAllowed() {
        return Roles.familyAdmin;
    }
}
@Injectable()
export class distCenterAdminGuard extends AuthenticatedGuard {

    isAllowed() {
        return Roles.distCenterAdmin;
    }
}
@Injectable()
export class distCenterOrOverviewOrAdmin extends AuthenticatedGuard {

    isAllowed() {
        return remult.isAllowed([Roles.distCenterAdmin, Roles.admin, Roles.overview]);
    }
}

@Injectable()
export class OverviewGuard extends AuthenticatedGuard {

    isAllowed() {
        return Roles.overview;
    }
}

@Injectable()
export class CallModuleGuard extends AuthenticatedGuard {


    isAllowed() {

        return remult.isAllowed(Roles.callPerson) && getSettings().usingCallModule;
    }
}




@Injectable()
export class OverviewOrAdminGuard extends AuthenticatedGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.overview);
    }
}
@Injectable()
export class SignedInAndNotOverviewGuard extends AuthenticatedGuard {

    isAllowed() {
        return c => c.authenticated() && !c.isAllowed(Roles.overview)
    }
}

@Injectable()
export class IndieGuard extends AuthenticatedGuard {
    isAllowed() {
        return Roles.indie;
    }
}
@Injectable()
export class LabGuard extends AuthenticatedGuard {
    isAllowed() {
        return Roles.lab;
    }
}

@Injectable()
export class distCenterOrLabGuard extends AuthenticatedGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.lab) || c.isAllowed(Roles.distCenterAdmin);
    }
}

@Injectable()
export class EventListGuard implements CanActivate {
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return !remult.authenticated() || !remult.isAllowed(Roles.distCenterAdmin)
    }


}
