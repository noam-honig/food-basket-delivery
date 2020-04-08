import { SignedInGuard } from '@remult/core';
import { Injectable } from "@angular/core";


export class Roles {
    static admin = 'deliveryAdmin';
    static overview = 'overview';
}


@Injectable()
export class AdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.admin;
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