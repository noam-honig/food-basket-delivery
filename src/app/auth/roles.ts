import { SignedInGuard } from '@remult/core';
import { Injectable } from "@angular/core";


export class Roles {
    static admin = 'deliveryAdmin';
    static overview='overview';
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



