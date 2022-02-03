import { Component, OnInit } from '@angular/core';

import { Remult, Controller, BackendMethod, getFields, ProgressListener } from 'remult';
import { RouteHelperService, BusyService, DataControl, openDialog } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { Sites, getLang } from '../sites/sites';

import { DistributionCenters } from '../manage/distribution-centers';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { Families } from '../families/families';
import { BasketType } from '../families/BasketType';
import { ArchiveHelper } from '../family-deliveries/family-deliveries-actions';
import { PromiseThrottle } from '../shared/utils';
import { async } from 'rxjs/internal/scheduler/async';
import { FamilyStatus } from '../families/FamilyStatus';
import { use, Field } from '../translate';
import { GroupsValue } from '../manage/groups';


function visible(when: () => boolean, caption?: string) {
    return {
        caption,
        dataControlSettings: () => ({ visible: () => when() })
    };
}

@Controller('createNewEvent')
export class CreateNewEvent {
    @Field()
    archiveHelper: ArchiveHelper = new ArchiveHelper();
    @Field({ translation: l => l.createNewDeliveryForAllFamilies })
    createNewDelivery: boolean;
    @Field<CreateNewEvent>()
    @DataControl<CreateNewEvent>({ visible: (self) => self.dialog?.hasManyCenters && self.createNewDelivery && self.moreOptions })
    useFamilyDistributionList: boolean = true;
    @Field<CreateNewEvent>()
    @DataControl<CreateNewEvent>({ visible: (self) => self.dialog?.hasManyCenters && self.createNewDelivery && self.moreOptions && !self.useFamilyDistributionList })
    distributionCenter: DistributionCenters;
    @DataControl({ visible: () => false })
    @Field<CreateNewEvent>()
    _selectedDistributionList: DistributionCenters;
    get selectedDistributionList() {
        if (this.allDistCenters)
            return null;
        return this._selectedDistributionList;
    }
    @DataControl({ visible: () => false })
    @Field<CreateNewEvent>()
    allDistCenters: boolean = false;

    @Field({ translation: l => l.moreOptions })
    @DataControl<CreateNewEvent>({ visible: (self) => self.createNewDelivery })
    moreOptions: boolean;
    @Field({ translation: l => l.includeGroups })
    @DataControl<CreateNewEvent>({ visible: self => self.createNewDelivery && self.moreOptions })

    includeGroups: GroupsValue;
    @Field({ translation: l => l.excludeGroups })
    @DataControl<CreateNewEvent>({ visible: self => self.createNewDelivery && self.moreOptions })

    excludeGroups: GroupsValue;
    @Field({ translation: l => l.useFamilyDefaultBasketType })
    @DataControl<CreateNewEvent>({ visible: self => self.createNewDelivery && self.moreOptions })
    useFamilyBasket: boolean;
    @DataControl<CreateNewEvent>({ visible: self => !self.useFamilyBasket })
    @Field()
    basketType: BasketType;


    constructor(private remult: Remult) {


    }

    isAllowed() {
        return this.remult.isAllowed(Roles.admin);
    }
    get $() { return getFields(this, this.remult) };
    @BackendMethod({ queue: true, allowed: Roles.admin })
    async createNewEvent(progress?: ProgressListener) {
        let settings = await ApplicationSettings.getAsync(this.remult);
        for (const x of [
            [this.$.createNewDelivery, settings.$.createBasketsForAllFamiliesInCreateEvent],
            [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
            [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]]) {
            x[1].value = x[0].value;
        }
        await settings.save();

        let pt = new PromiseThrottle(10);
        for await (const fd of this.remult.repo(ActiveFamilyDeliveries).query({ where: { distributionCenter: this.remult.filterDistCenter(this.selectedDistributionList) } })) {
            this.archiveHelper.forEach(fd);
            fd.archive = true;
            await pt.push(fd.save());
        }
        await pt.done();
        let r = 0;
        if (this.createNewDelivery) {
            r = await this.iterateFamilies(async f => {
                let fd = await f.createDelivery(this.useFamilyDistributionList ? null : this.distributionCenter);
                fd._disableMessageToUsers = true;
                if (this.moreOptions) {
                    if (!this.useFamilyBasket)
                        fd.basketType = this.basketType;
                }
                await fd.save();
            }, progress);
            Families.SendMessageToBrowsers(r + " " + getLang(this.remult).deliveriesCreated, this.remult, '');
        }
        return r;

    }

    async iterateFamilies(what: (f: Families) => Promise<any>, progress: ProgressListener) {
        //let pt = new PromiseThrottle(10);
        let i = 0;


        for await (let f of this.remult.repo(Families).query({ where: { status: FamilyStatus.Active }, progress })) {
            let match = true;
            if (this.moreOptions) {
                if (this.includeGroups?.hasAny()) {
                    match = false;
                    for (let g of this.includeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            match = true;
                        }

                    }
                }
                if (this.excludeGroups?.hasAny()) {
                    for (let g of this.excludeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            match = false;
                        }

                    }
                }
            }
            if (match) {
                i++;
                await what(f);
            }
        }
        //    await pt.done();
        return i;


    }
    dialog: DialogService;

    async show(dialog: DialogService, settings: ApplicationSettings, routeHelper: RouteHelperService) {
        this.dialog = dialog;
        await settings._.reload();
        for (const x of [
            [this.$.createNewDelivery, settings.$.createBasketsForAllFamiliesInCreateEvent],
            [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
            [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]]) {
            x[0].value = x[1].value;
        }
        if (this.includeGroups.evilGet() != '') {
            this.moreOptions = true;
        }
        this._selectedDistributionList = dialog.distCenter;
        if (dialog.distCenter == null)
            this.allDistCenters = true;


        let notDoneDeliveries = await this.remult.repo(ActiveFamilyDeliveries).count({ ...FamilyDeliveries.readyFilter(), distributionCenter: this.remult.filterDistCenter(this.selectedDistributionList) });
        if (notDoneDeliveries > 0) {
            await dialog.messageDialog(getLang(this.remult).thereAre + " " + notDoneDeliveries + " " + getLang(this.remult).notDoneDeliveriesShouldArchiveThem);
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        let threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        let recentOnTheWay = await this.remult.repo(ActiveFamilyDeliveries).count({
            $and: [FamilyDeliveries.onTheWayFilter()],
            courierAssingTime: { ">=": threeHoursAgo },
            distributionCenter: this.remult.filterDistCenter(this.selectedDistributionList)
        });
        if (recentOnTheWay > 0 && !await dialog.YesNoPromise(getLang(this.remult).thereAre + " " + recentOnTheWay + " " + getLang(this.remult).deliveresOnTheWayAssignedInTheLast3Hours)) {
            routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);
            return;
        }
        this.useFamilyBasket = true;

        let archiveHelperFields = await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.remult, { distributionCenter: this.remult.filterDistCenter(this.selectedDistributionList) }, settings.usingSelfPickupModule);


        openDialog(InputAreaComponent, x => x.args = {
            title: settings.lang.createNewEvent,
            helpText: settings.lang.createNewEventHelp,
            settings: {
                fields: () => [...archiveHelperFields, ...[...this.$].filter(x => x != this.$.archiveHelper)]
            },
            ok: async () => {
                let deliveriesCreated = await this.createNewEvent();
                dialog.refreshFamiliesAndDistributionCenters();
                dialog.distCenter = dialog.distCenter;
                if (await dialog.YesNoPromise(settings.lang.doneDotGotoDeliveries)) {
                    routeHelper.navigateToComponent((await import('../family-deliveries/family-deliveries.component')).FamilyDeliveriesComponent);

                }
            },
            cancel: () => { },
            validate: async () => {


                let count = await this.remult.repo(ActiveFamilyDeliveries).count({ distributionCenter: this.remult.filterDistCenter(this.selectedDistributionList) });
                if (count > 0) {
                    if (!await dialog.YesNoPromise(getLang(this.remult).confirmArchive + " " + count + " " + getLang(this.remult).deliveries))
                        throw getLang(this.remult).actionCanceled;
                }
                if (this.createNewDelivery && !await dialog.YesNoPromise(getLang(this.remult).create + " " + await this.countNewDeliveries() + " " + getLang(this.remult).newDeliveriesQM))
                    throw getLang(this.remult).actionCanceled;
            }



        });

    }



    @BackendMethod({ queue: true, allowed: Roles.admin })
    async countNewDeliveries(progress?: ProgressListener) {
        return this.iterateFamilies(async () => { }, progress);
    }
}

