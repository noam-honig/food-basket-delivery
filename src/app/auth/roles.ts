import { SignedInGuard } from '@remult/core';
import { Injectable } from "@angular/core";


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
export class distCenterAndNotAdmin extends SignedInGuard {

    isAllowed() {
        return x => x.isAllowed(Roles.distCenterAdmin) && !x.isAllowed(Roles.admin);
    }
}

@Injectable()
export class OverviewGuard extends SignedInGuard {

    isAllowed() {
        return Roles.overview;
    }
}



