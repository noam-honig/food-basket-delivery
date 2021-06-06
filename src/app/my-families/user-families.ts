
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType } from "../families/BasketType";
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Context } from '@remult/core';

import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { BasketSummaryComponent } from "../basket-summary/basket-summary.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { DistributionCenters } from "../manage/distribution-centers";
import { routeStats } from "../asign-family/route-strategy";
import { openDialog } from "../../../../radweb/projects/angular";


export class UserFamiliesList {
    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
        this.map.userClickedOnFamilyOnMap = (f) => this.userClickedOnFamilyOnMap(f);
        if (this.allFamilies)
            this.map.test(this.allFamilies, this.helper);
    }
    startAssignByMap(city: string, group: string, distCenter: DistributionCenters, area: string, basketType: BasketType) {

        this.map.loadPotentialAsigment(city, group, distCenter, area, basketType);
        setTimeout(() => {
            this.map.gmapElement.nativeElement.scrollIntoView();
        }, 100);
    }
    forceShowMap = false;

    constructor(private context: Context, private settings: ApplicationSettings) { }
    toDeliver: ActiveFamilyDeliveries[] = [];
    delivered: ActiveFamilyDeliveries[] = [];
    problem: ActiveFamilyDeliveries[] = [];
    allFamilies: ActiveFamilyDeliveries[] = [];
    maxAssignTime: number;
    getHelperPhone() {
        return this.helper.phone.displayValue;
    }
    helper: Helpers;
    escort: HelpersBase;
    prevRouteStats: routeStats;
    routeStats: routeStats;
    setRouteStats(stats: routeStats) {
        this.prevRouteStats = this.routeStats;
        this.routeStats = stats;
    }
    getKmDiffString() {
        if (!this.routeStats || !this.prevRouteStats)
            return '';
        if (this.prevRouteStats.totalKm == 0)
            return '';
        let r = this.routeStats.totalKm - this.prevRouteStats.totalKm;
        if (r >= 0)
            return " (" + r + "+) ";
        return " (" + -r + "-) ";
    }
    userClickedOnFamilyOnMap: (familyId: string[]) => void = x => { };
    async initForHelper(helper: HelpersBase) {
        if (helper != this.helper) {
            this.initHelper(helper);
            if (helper) {
                this.routeStats = helper.getRouteStats();
                this.prevRouteStats = undefined;
            }
        }
        await this.reload();

    }
    private async initHelper(h: HelpersBase) {
        this.helper = await h.getHelper();
        this.escort = undefined;
        if (this.helper && h.escort) {
            this.escort = await h.$.escort.load()
        }

    }
    showBasketSummary() {
        openDialog(BasketSummaryComponent, x => x.families = this);
    }
    getLeftFamiliesDescription() {


        let boxes = 0;
        let boxes2 = 0;
        for (const iterator of this.toDeliver) {
            
            let item = iterator.basketType;
            if (item) {
                boxes += item.boxes * iterator.quantity;
                boxes2 += item.boxes2 * iterator.quantity;
            }
        }
        if (this.toDeliver.length == 0)
            return this.settings.lang.noDeliveries;
        let r = '';
        if (this.toDeliver.length == 1) {
            r = this.settings.lang.oneDeliveryToDistribute;
        }
        else
            r = this.toDeliver.length + ' ' + this.settings.lang.deliveriesToDistribute;

        let boxesText = '';
        if (boxes != this.toDeliver.length || boxes2 != 0)
            boxesText += + boxes + ' ' + BasketType.boxes1Name;
        if (boxes2 != 0) {
            boxesText += ' ' + this.settings.lang.and + " " + boxes2 + ' ' + BasketType.boxes2Name;
        }
        if (boxesText != '')
            r += ' (' + boxesText + ')';
        return r;

    }
    async initForFamilies(helper: HelpersBase, familiesPocoArray: any[]) {
        this.initHelper(helper);
        let newFamilies = await Promise.all(familiesPocoArray.map(x => this.context.for(ActiveFamilyDeliveries).fromPojo(x)));
        newFamilies.push(...this.delivered);
        newFamilies.push(...this.problem);
        this.allFamilies = newFamilies;
        this.initFamilies();
    }
    addFamily(d: FamilyDeliveries) {
        this.allFamilies.push(d);
        this.initFamilies();
    }
    familiesAlreadyAssigned = new Map<string, boolean>();
    highlightNewFamilies = false;
    lastHelperId = undefined;
    async reload() {
        if (this.helper && !this.helper.isNew()) {
            this.allFamilies = await this.context.for(ActiveFamilyDeliveries).find({
                where: f => {
                    let r = f.courier.isEqualTo(this.helper);
                    if (this.settings.isSytemForMlt())
                        return r;
                    return r.and(f.visibleToCourier.isEqualTo(true))
                }, orderBy: f => [f.deliverStatus, f.routeOrder, f.address], limit: 1000
            });
            if (this.lastHelperId != this.helper.id) {
                this.lastHelperId = this.helper.id;
                this.familiesAlreadyAssigned = new Map<string, boolean>();
                this.highlightNewFamilies = false;
                for (const f of this.allFamilies) {
                    this.highlightNewFamilies = true;
                    this.familiesAlreadyAssigned.set(f.id, true);
                }

            }
        }
        else {
            this.allFamilies = [];
            this.highlightNewFamilies = false;
        }
        this.initFamilies();
    }

    distCenter: DistributionCenters;

    async refreshRoute(args: import("../asign-family/asign-family.component").refreshRouteArgs) {
        
        await (await import("../asign-family/asign-family.component")).AsignFamilyComponent.RefreshRoute(this.helper, args).then(r => {

            if (r && r.ok && r.families.length == this.toDeliver.length) {
                this.setRouteStats(r.stats);
                this.initForFamilies(this.helper, r.families);
            }
        });
    }

    initFamilies() {


        this.allFamilies = this.allFamilies.filter(f => f.archive == false);

        if (this.allFamilies.length > 0 && this.settings.showDistCenterAsEndAddressForVolunteer) {
            this.allFamilies[0].$.distributionCenter.load().then(x => this.distCenter = x);
        }
        else {
            this.distCenter = undefined;
        }
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus == DeliveryStatus.ReadyForDelivery);
        if (this.toDeliver.find(f => f.routeOrder == 0) && this.toDeliver.length > 0) {
            this.refreshRoute({});
        }
        if (this.toDeliver.length == 0)
            this.prevRouteStats = undefined;
        this.maxAssignTime = undefined;
        for (const f of this.toDeliver) {
            if (f.courierAssingTime && (this.maxAssignTime == undefined || this.maxAssignTime < f.courierAssingTime.valueOf()))
                this.maxAssignTime = f.courierAssingTime.valueOf();
        }
        this.delivered = this.allFamilies.filter(f => f.deliverStatus == DeliveryStatus.Success || f.deliverStatus == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus) {
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedDoNotWant:

                case DeliveryStatus.FailedNotReady:
                case DeliveryStatus.FailedTooFar:

                case DeliveryStatus.FailedOther:
                    return true;
            }
            return false;

        });
        if (this.map)
            this.map.test(this.allFamilies, this.helper);
        let hash: any = {};


    }

    remove(f: ActiveFamilyDeliveries) {
        this.allFamilies.splice(this.allFamilies.indexOf(f), 1);
        this.initFamilies();
    }
    clear() {
        this.allFamilies = [];
        this.delivered = [];
        this.problem = [];
        this.toDeliver = [];
        if (this.map)
            this.map.clear();
        this.forceShowMap = false;



    }
}
