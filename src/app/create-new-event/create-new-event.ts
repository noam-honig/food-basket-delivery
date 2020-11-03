import { Component, OnInit } from '@angular/core';

import { StringColumn, NumberColumn, DataAreaSettings, ServerFunction, Context, Column, IdColumn, BoolColumn, RouteHelperService, BusyService } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites, getLang } from '../sites/sites';

import { allCentersToken, DistributionCenterId, DistributionCenters } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { GroupsColumn, Families } from '../families/families';
import { BasketId } from '../families/BasketType';
import { ArchiveHelper } from '../family-deliveries/family-deliveries-actions';
import { PromiseThrottle } from '../shared/utils';
import { async } from 'rxjs/internal/scheduler/async';
import { FamilyStatus } from '../families/FamilyStatus';

function visible(when: () => boolean, caption?: string) {
    return {
        caption,
        dataControlSettings: () => ({ visible: () => when() })
    };
}


export class CreateNewEvent {
    archiveHelper = new ArchiveHelper(this.context);
    createNewDelivery = new BoolColumn(getLang(this.context).createNewDeliveryForAllFamilies);
    distributionCenter = new DistributionCenterId(this.context, { dataControlSettings: () => ({ visible: () => false }) });
    moreOptions = new BoolColumn(visible(() => this.createNewDelivery.value, getLang(this.context).moreOptions));
    includeGroups = new GroupsColumn(this.context, visible(() => this.moreOptions.value, getLang(this.context).includeGroups));
    excludeGroups = new GroupsColumn(this.context, visible(() => this.moreOptions.value, getLang(this.context).excludeGroups));
    useFamilyBasket = new BoolColumn(visible(() => this.moreOptions.value, getLang(this.context).useFamilyDefaultBasketType));
    basketType = new BasketId(this.context, visible(() => !this.useFamilyBasket.value));

    constructor(private context: Context) {

    }

    columns = [...this.archiveHelper.getColumns(),
    this.createNewDelivery,
    this.distributionCenter,
    this.moreOptions,
    this.includeGroups,
    this.excludeGroups,
    this.useFamilyBasket,
    this.basketType];

    async createNewEvent() {
        let settings = await ApplicationSettings.getAsync(this.context);
        for (const x of [
            [this.createNewDelivery, settings.createBasketsForAllFamiliesInCreateEvent],
            [this.includeGroups, settings.includeGroupsInCreateEvent],
            [this.excludeGroups, settings.excludeGroupsInCreateEvent]]) {
            x[1].value = x[0].value;
        }
        await settings.save();

        let pt = new PromiseThrottle(10);
        for await (const fd of this.context.for(ActiveFamilyDeliveries).iterate({ where: fd => fd.distributionCenter.filter(this.distributionCenter.value) })) {
            this.archiveHelper.forEach(fd);
            fd.archive.value = true;
            await pt.push(fd.save());
        }
        await pt.done();
        let r = 0;
        if (this.createNewDelivery.value) {
            r = await this.iterateFamilies(async f => {
                let fd = await f.createDelivery(this.distributionCenter.value);
                fd._disableMessageToUsers = true;
                if (this.moreOptions.value) {
                    if (!this.useFamilyBasket.value)
                        fd.basketType.value = this.basketType.value;
                }
                await fd.save();
            });
            Families.SendMessageToBrowsers(r + " " + getLang(this.context).deliveriesCreated, this.context, '');
        }
        return r;

    }

    async iterateFamilies(what: (f: Families) => Promise<any>) {
        let pt = new PromiseThrottle(10);
        let i = 0;
        for await (let f of this.context.for(Families).iterate({ where: f => f.status.isEqualTo(FamilyStatus.Active) })) {
            let match = true;
            if (this.moreOptions.value) {
                if (this.includeGroups.value) {
                    match = false;
                    for (let g of this.includeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            match = true;
                        }

                    }
                }
                if (this.excludeGroups.value) {
                    for (let g of this.excludeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            match = false;
                        }

                    }
                }
            }
            if (match) {
                i++;
                await pt.push(what(f));
            }
        }
        await pt.done();
        return i;


    }

    async show(dialog: DialogService, settings: ApplicationSettings, routeHelper: RouteHelperService, busy: BusyService) {
        await settings.reload();
        for (const x of [
            [this.createNewDelivery, settings.createBasketsForAllFamiliesInCreateEvent],
            [this.includeGroups, settings.includeGroupsInCreateEvent],
            [this.excludeGroups, settings.excludeGroupsInCreateEvent]]) {
            x[0].value = x[1].value;
        }
        if (this.includeGroups.value) {
            this.moreOptions.value = true;
        }
        this.distributionCenter.value = dialog.distCenter.value;

        if (this.distributionCenter.value == allCentersToken) {
            let centers = await this.context.for(DistributionCenters).find({ where: x => x.isActive() });
            if (centers.length == 1)
                this.distributionCenter.value = centers[0].id.value;
            else {
                await dialog.Error(getLang(this.context).pleaseSelectDistributionList);
                return;
            }
        }

        let notDoneDeliveries = await this.context.for(ActiveFamilyDeliveries).count(x => x.readyFilter().and(x.distributionCenter.filter(this.distributionCenter.value)));
        if (notDoneDeliveries > 0) {
            await dialog.messageDialog(getLang(this.context).thereAre + " " + notDoneDeliveries + " " + getLang(this.context).notDoneDeliveriesShouldArchiveThem);
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        let threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        let recentOnTheWay = await this.context.for(ActiveFamilyDeliveries).count(x => x.onTheWayFilter().and(x.courierAssingTime.isGreaterOrEqualTo(threeHoursAgo)).and(x.distributionCenter.filter(this.distributionCenter.value)));
        if (recentOnTheWay > 0 && !await dialog.YesNoPromise(getLang(this.context).thereAre + " " + recentOnTheWay + " " + getLang(this.context).deliveresOnTheWayAssignedInTheLast3Hours)) {
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        this.useFamilyBasket.value = true;

        await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(x => x.distributionCenter.filter(this.distributionCenter.value), settings.usingSelfPickupModule.value);


        this.context.openDialog(InputAreaComponent, x => x.args = {
            title: settings.lang.createNewEvent,
            helpText: settings.lang.createNewEventHelp,
            settings: {
                columnSettings: () => this.columns
            },
            ok: async () => {
                let deliveriesCreated = await CreateNewEvent.createNewEvent(pack(this));
                dialog.distCenter.value = dialog.distCenter.value;
                if (await dialog.YesNoPromise(settings.lang.doneDotGotoDeliveries)) {
                    routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);

                }
            },
            cancel: () => { },
            validate: async () => {


                let count = await this.context.for(ActiveFamilyDeliveries).count(x => x.distributionCenter.filter(this.distributionCenter.value));
                if (count > 0) {
                    if (!await dialog.YesNoPromise(getLang(this.context).confirmArchive + " " + count + " " + getLang(this.context).deliveries))
                        throw getLang(this.context).actionCanceled;
                }
                if (this.createNewDelivery.value && !await dialog.YesNoPromise(getLang(this.context).create + " " + await CreateNewEvent.countNewDeliveries(pack(this)) + " " + getLang(this.context).newDeliveriesQM))
                    throw getLang(this.context).actionCanceled;
            }



        });

    }
    @ServerFunction({ allowed: Roles.admin })
    static async createNewEvent(args: any[], context?: Context) {
        let x = new CreateNewEvent(context);
        x.unpack(args);
        return x.createNewEvent();
    }
    @ServerFunction({ allowed: Roles.admin })
    static async countNewDeliveries(args: any[], context?: Context) {
        let x = new CreateNewEvent(context);
        x.unpack(args);
        return x.iterateFamilies(async () => { });

    }
    unpack(args: any[]) {
        let i = 0;
        for (const c of this.columns) {
            c.rawValue = args[i++];
        }
    }
}




