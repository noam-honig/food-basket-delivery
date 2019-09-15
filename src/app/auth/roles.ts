import { SignedInGuard } from "radweb";
import { Injectable } from "@angular/core";


export class Roles {
    static admin = 'deliveryAdmin';
}


@Injectable()
export class AdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.admin;
    }
}



