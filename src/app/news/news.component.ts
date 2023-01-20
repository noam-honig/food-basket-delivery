import { Component, OnInit, OnDestroy } from '@angular/core';

import { DeliveryStatus } from "../families/DeliveryStatus";
import {  EntityFilter, remult } from 'remult';
import { DialogService, DestroyHelper } from '../select-popup/dialog';

import { Route, ActivatedRoute } from '@angular/router';


import { Filter } from 'remult';
import { BusyService, openDialog } from '../common-ui-elements';
import { distCenterAdminGuard } from '../auth/guards';
import { Roles } from '../auth/roles';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Helpers } from '../helpers/helpers';

import { FamilySources } from '../families/FamilySources';
import { NewsFilterService } from './news-filter-service';

import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { DeliveryImagesComponent } from '../delivery-images/delivery-images.component';

@Component({
    selector: 'app-news',
    templateUrl: './news.component.html',
    styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit, OnDestroy {
    isAdmin() {
        return remult.isAllowed(Roles.admin);
    }
    static needsWorkRoute: Route = {
        path: 'needsWork', component: NewsComponent, canActivate: [distCenterAdminGuard]
    };

    filterChange() {

        this.refresh();
    }
    deliveryImages(n: ActiveFamilyDeliveries) {
        openDialog(DeliveryImagesComponent, x => x.args = n);
    }

    constructor(private dialog: DialogService, private busy: BusyService, public filters: NewsFilterService, private activatedRoute: ActivatedRoute, public settings: ApplicationSettings) {
        dialog.onStatusChange(() => this.refresh(), this.destroyHelper);
        dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);

    }
    async updateFamily(n: ActiveFamilyDeliveries) {
        n.showDetailsDialog({ ui: this.dialog });


    }
    shouldShowNeedsWork = new Map<string, boolean>();
    showNeedsWork(n: ActiveFamilyDeliveries) {
        if (!this.shouldShowNeedsWork.has(n.id)) {
            this.shouldShowNeedsWork.set(n.id, n.needsWork);
        }
        return this.shouldShowNeedsWork.get(n.id);

    }
    needWorkWasChanged(n: ActiveFamilyDeliveries, args: MatCheckboxChange) {
        n.needsWork = !args.checked;
        this.busy.donotWait(async () => await n.save());
    }

    async showHelper(n: ActiveFamilyDeliveries) {
        openDialog(
            HelperAssignmentComponent, async s => s.argsHelper = n.courier);
    }
    destroyHelper = new DestroyHelper();
    ngOnDestroy(): void {
        this.destroyHelper.destroy();
    }
    news: FamilyDeliveries[] = [];
    familySources: familySource[] = [{ id: undefined, name: this.settings.lang.allFamilySources }];

    async ngOnInit() {
        if (this.activatedRoute.routeConfig.path == NewsComponent.needsWorkRoute.path) {
            this.filters.setToNeedsWork();
        }
        this.refresh();
        this.familySources.push(...(await remult.repo(FamilySources).find({ orderBy: { name: "asc" } })).map(x => { return { id: x.id, name: x.name } as familySource }));

    }
    newsRows = 50;
    async refresh() {

        this.busy.donotWait(async () => {
            this.news = await remult.repo(FamilyDeliveries).find({
                where:  {
                    distributionCenter:this.dialog.filterDistCenter(),
                    $and:[
                        this.filters.where()
                    ]

                }, orderBy: { deliveryStatusDate: "desc" }, limit: this.newsRows
            });
        });
    }
    moreNews() {
        this.newsRows *= 2;
        this.refresh();
    }
    icon(n: ActiveFamilyDeliveries) {
        switch (n.deliverStatus) {
            case DeliveryStatus.ReadyForDelivery:

                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessLeftThere:
            case DeliveryStatus.SuccessPickedUp:
                return 'check';
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedDoNotWant:

            case DeliveryStatus.FailedNotReady:
            case DeliveryStatus.FailedTooFar:

            case DeliveryStatus.FailedOther:
                return 'error';

        }
        return "create";
    }
}
export interface NewsFilter {
    name: string;
    where?: EntityFilter<ActiveFamilyDeliveries>;
}
interface familySource {
    name: string;
    id: string;
}
