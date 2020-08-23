import { SignedInGuard, Context } from '@remult/core';
import { Injectable } from "@angular/core";



export class Roles {
    static admin = 'deliveryAdmin';
    static distCenterAdmin = 'distCenterAdmin';
    static overview = 'overview';
    static lab = 'lab';
    static indie = 'indie'
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
export class OverviewOrAdminGuard extends SignedInGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.overview);
    }
}

@Injectable()
export class IndieGuard extends SignedInGuard {
    isAllowed() {
        return Roles.indie;
    }
}
@Injectable()
export class LabGuard extends SignedInGuard {
    isAllowed() {
        return Roles.lab;
    }
}

@Injectable()
export class distCenterOrLabGuard extends SignedInGuard {

    isAllowed() {
        return c => c.isAllowed(Roles.admin) || c.isAllowed(Roles.lab) || c.isAllowed(Roles.distCenterAdmin);
    }
}
