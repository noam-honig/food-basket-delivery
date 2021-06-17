import { Component, OnInit } from '@angular/core';

import { ServerFunction, Context, ServerController, controllerAllowed, ServerMethod, ServerProgress, getControllerDefs } from '@remult/core';
import { RouteHelperService, BusyService, DataControl, openDialog } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { Sites, getLang } from '../sites/sites';

import { DistributionCenters } from '../manage/distribution-centers';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { Families, GroupsValue } from '../families/families';
import { BasketType } from '../families/BasketType';
import { ArchiveHelper } from '../family-deliveries/family-deliveries-actions';
import { PromiseThrottle } from '../shared/utils';
import { async } from 'rxjs/internal/scheduler/async';
import { FamilyStatus } from '../families/FamilyStatus';
import { use, Field } from '../translate';
import { u } from '../model-shared/UberContext';


function visible(when: () => boolean, caption?: string) {
    return {
        caption,
        dataControlSettings: () => ({ visible: () => when() })
    };
}

@ServerController({
    key: 'createNewEvent',
    allowed: Roles.admin
})
export class CreateNewEvent {
    @Field()
    archiveHelper: ArchiveHelper = new ArchiveHelper();
    @Field({ translation: l => l.createNewDeliveryForAllFamilies })
    createNewDelivery: boolean;
    @Field()
    @DataControl({ visible: () => false })
    distributionCenter: DistributionCenters;
    @Field({ translation: l => l.moreOptions })
    @DataControl<CreateNewEvent>({ visible: (self) => self.createNewDelivery })
    moreOptions: boolean;
    @Field({ translation: l => l.includeGroups })
    @DataControl<CreateNewEvent>({ visible: self => self.moreOptions })

    includeGroups: GroupsValue;
    @Field({ translation: l => l.excludeGroups })
    @DataControl<CreateNewEvent>({ visible: self => self.moreOptions })

    excludeGroups: GroupsValue;
    @Field({ translation: l => l.useFamilyDefaultBasketType })
    @DataControl<CreateNewEvent>({ visible: self => self.moreOptions })
    useFamilyBasket: boolean;
    @DataControl<CreateNewEvent>({ visible: self => !self.useFamilyBasket })
    @Field()
    basketType: BasketType;


    constructor(private context: Context) {


    }
    cContext = u(this.context);
    isAllowed() {
        return controllerAllowed(this, this.context);
    }
    get $() { return getControllerDefs(this, this.context).fields };
    @ServerMethod({ queue: true, allowed: Roles.admin })
    async createNewEvent(progress?: ServerProgress) {
        let settings = await ApplicationSettings.getAsync(this.context);
        for (const x of [
            [this.$.createNewDelivery, settings.$.createBasketsForAllFamiliesInCreateEvent],
            [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
            [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]]) {
            x[1].value = x[0].value;
        }
        await settings.save();

        let pt = new PromiseThrottle(10);
        for await (const fd of this.context.for(ActiveFamilyDeliveries).iterate({ where: fd => this.cContext.filterDistCenter(fd.distributionCenter, this.distributionCenter) })) {
            this.archiveHelper.forEach(fd);
            fd.archive = true;
            await pt.push(fd.save());
        }
        await pt.done();
        let r = 0;
        if (this.createNewDelivery) {
            r = await this.iterateFamilies(async f => {
                let fd = await f.createDelivery(this.distributionCenter);
                fd._disableMessageToUsers = true;
                if (this.moreOptions) {
                    if (!this.useFamilyBasket)
                        fd.basketType = this.basketType;
                }
                await fd.save();
            }, progress);
            Families.SendMessageToBrowsers(r + " " + getLang(this.context).deliveriesCreated, this.context, '');
        }
        return r;

    }

    async iterateFamilies(what: (f: Families) => Promise<any>, progress: ServerProgress) {
        let pt = new PromiseThrottle(10);
        let i = 0;


        for await (let f of this.context.for(Families).iterate({ where: f => f.status.isEqualTo(FamilyStatus.Active), progress })) {
            let match = true;
            if (this.moreOptions) {
                if (this.includeGroups) {
                    match = false;
                    for (let g of this.includeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            match = true;
                        }

                    }
                }
                if (this.excludeGroups) {
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

    async show(dialog: DialogService, settings: ApplicationSettings, routeHelper: RouteHelperService) {
        await settings._.reload();
        for (const x of [
            [this.$.createNewDelivery, settings.$.createBasketsForAllFamiliesInCreateEvent],
            [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
            [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]]) {
            x[0].value = x[1].value;
        }
        if (this.includeGroups) {
            this.moreOptions = true;
        }
        this.distributionCenter = dialog.distCenter;

        if (!this.distributionCenter) {
            this.distributionCenter = await DistributionCenters.getDefault(this.context);
            if (!this.distributionCenter) {
                await dialog.Error(getLang(this.context).pleaseSelectDistributionList);
                return;
            }
        }

        let notDoneDeliveries = await this.context.for(ActiveFamilyDeliveries).count(x => this.cContext.readyFilter(x).and(this.cContext.filterDistCenter(x.distributionCenter, this.distributionCenter)));
        if (notDoneDeliveries > 0) {
            await dialog.messageDialog(getLang(this.context).thereAre + " " + notDoneDeliveries + " " + getLang(this.context).notDoneDeliveriesShouldArchiveThem);
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        let threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        let recentOnTheWay = await this.context.for(ActiveFamilyDeliveries).count(x => FamilyDeliveries.onTheWayFilter(x).and(x.courierAssingTime.isGreaterOrEqualTo(threeHoursAgo)).and(this.cContext.filterDistCenter(x.distributionCenter, this.distributionCenter)));
        if (recentOnTheWay > 0 && !await dialog.YesNoPromise(getLang(this.context).thereAre + " " + recentOnTheWay + " " + getLang(this.context).deliveresOnTheWayAssignedInTheLast3Hours)) {
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        this.useFamilyBasket = true;

        let archiveHelperFields = await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.context, x => this.cContext.filterDistCenter(x.distributionCenter, this.distributionCenter), settings.usingSelfPickupModule);


        openDialog(InputAreaComponent, x => x.args = {
            title: settings.lang.createNewEvent,
            helpText: settings.lang.createNewEventHelp,
            settings: {
                fields: () => [...archiveHelperFields, ...[...this.$].filter(x => x != this.$.archiveHelper)]
            },
            ok: async () => {
                let deliveriesCreated = await this.createNewEvent();
                dialog.distCenter = dialog.distCenter;
                if (await dialog.YesNoPromise(settings.lang.doneDotGotoDeliveries)) {
                    routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);

                }
            },
            cancel: () => { },
            validate: async () => {


                let count = await this.context.for(ActiveFamilyDeliveries).count(x => this.cContext.filterDistCenter(x.distributionCenter, this.distributionCenter));
                if (count > 0) {
                    if (!await dialog.YesNoPromise(getLang(this.context).confirmArchive + " " + count + " " + getLang(this.context).deliveries))
                        throw getLang(this.context).actionCanceled;
                }
                if (this.createNewDelivery && !await dialog.YesNoPromise(getLang(this.context).create + " " + await this.countNewDeliveries() + " " + getLang(this.context).newDeliveriesQM))
                    throw getLang(this.context).actionCanceled;
            }



        });

    }



    @ServerMethod({ queue: true, allowed: Roles.admin })
    async countNewDeliveries(progress?: ServerProgress) {
        return this.iterateFamilies(async () => { }, progress);
    }
}

