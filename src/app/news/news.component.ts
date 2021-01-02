import { Component, OnInit, OnDestroy } from '@angular/core';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { Context, AndFilter } from '@remult/core';
import { DialogService, DestroyHelper } from '../select-popup/dialog';

import { Route, ActivatedRoute } from '@angular/router';


import { FilterBase } from '@remult/core';
import { BusyService } from '@remult/core';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Helpers } from '../helpers/helpers';

import { FamilySources } from '../families/FamilySources';
import { NewsFilterService } from './news-filter-service';

import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MatCheckboxChange } from '@angular/material';
@Component({
    selector: 'app-news',
    templateUrl: './news.component.html',
    styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit, OnDestroy {

    static needsWorkRoute: Route = {
        path: 'needsWork', component: NewsComponent, canActivate: [distCenterAdminGuard]
    };

    filterChange() {

        this.refresh();
    }

    constructor(private dialog: DialogService, private context: Context, private busy: BusyService, public filters: NewsFilterService, private activatedRoute: ActivatedRoute, public settings: ApplicationSettings) {
        dialog.onStatusChange(() => this.refresh(), this.destroyHelper);
        dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);

    }
    async updateFamily(n: ActiveFamilyDeliveries) {
        n.showDetailsDialog({ dialog: this.dialog });


    }
    shouldShowNeedsWork = new Map<string, boolean>();
    showNeedsWork(n: ActiveFamilyDeliveries) {
        if (!this.shouldShowNeedsWork.has(n.id.value)) {
            this.shouldShowNeedsWork.set(n.id.value, n.needsWork.value);
        }
        return this.shouldShowNeedsWork.get(n.id.value);

    }
    needWorkWasChanged(n: ActiveFamilyDeliveries, args: MatCheckboxChange) {
        n.needsWork.value = !args.checked;
        this.busy.donotWait(async ()=> await n.save());
    }
   
    async showHelper(n: ActiveFamilyDeliveries) {
        this.context.openDialog(
            HelperAssignmentComponent, s => s.argsHelper = this.context.for(Helpers).lookup(n.courier));
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
        this.familySources.push(...(await this.context.for(FamilySources).find({ orderBy: x => [x.name] })).map(x => { return { id: x.id.value, name: x.name.value } as familySource }));

    }
    newsRows = 50;
    async refresh() {

        this.busy.donotWait(async () => {
            this.news = await this.context.for(FamilyDeliveries).find({
                where: n => {
                    return new AndFilter(this.filters.where(n), n.distributionCenter.filter(this.dialog.distCenter.value));


                }, orderBy: n => [{ column: n.deliveryStatusDate, descending: true }], limit: this.newsRows
            });
        });
    }
    moreNews() {
        this.newsRows *= 2;
        this.refresh();
    }
    icon(n: ActiveFamilyDeliveries) {
        switch (n.deliverStatus.value) {
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
            //case DeliveryStatus.FailedAlreadyPickedUp: 
            case DeliveryStatus.FailedTooFar: 

            case DeliveryStatus.FailedOther:
                return 'error';

        }
        return "create";
        return n.deliverStatus.displayValue;
    }
}
export interface NewsFilter {
    name: string;
    where?: (rowType: ActiveFamilyDeliveries) => FilterBase;
}
interface familySource {
    name: string;
    id: string;
}
