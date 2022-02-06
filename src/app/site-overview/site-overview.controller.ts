import { Component, OnInit } from '@angular/core';
import { siteItem, dateRange } from '../overview/overview.controller';
import { MatDialogRef } from '@angular/material/dialog';
import { BackendMethod, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { createSiteContext } from '../helpers/init-context';
import { Helpers } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';


export class SiteOverviewController {
    @BackendMethod({ allowed: Roles.overview })
    static async siteInfo(site: string, remult?: Remult): Promise<Manager[]> {
        let c = await createSiteContext(site, remult);
        return (await c.repo(Helpers).find({ where: { admin: true }, orderBy: { lastSignInDate: "desc" } })).map(
            ({ name, phone, lastSignInDate }) => ({
                name, phone: phone?.thePhone, lastSignInDate
            })
        ).sort((a, b) => b.lastSignInDate?.valueOf() - a.lastSignInDate?.valueOf());
    }
}
export interface Manager {
    name: string,
    phone: string,
    lastSignInDate: Date
}
