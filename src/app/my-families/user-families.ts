
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType } from "../families/BasketType";
import { Helpers, HelpersBase } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { Context } from '@remult/core';

import { ElementRef } from '@angular/core';
import { PhoneColumn } from '../model-shared/types';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { BasketSummaryComponent } from "../basket-summary/basket-summary.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { DistributionCenters } from "../manage/distribution-centers";
import { routeStats } from "../asign-family/route-strategy";


export class UserFamiliesList {
    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
        this.map.userClickedOnFamilyOnMap = (f) => this.userClickedOnFamilyOnMap(f);
        if (this.allFamilies)
            this.map.test(this.allFamilies, this.helper);
    }
    startAssignByMap(city: string, group: string, distCenter: string, area: string, helper: Helpers) {

        this.map.loadPotentialAsigment(city, group, distCenter, area);
        setTimeout(() => {
            this.map.gmapElement.nativeElement.scrollIntoView();
        }, 100);
    }
    forceShowMap = false;

    constructor(private context: Context, private settings: ApplicationSettings) { }
    justFamiliesList=[];
    toDeliver: ActiveFamilyDeliveries[] = [];
    delivered: ActiveFamilyDeliveries[] = [];
    problem: ActiveFamilyDeliveries[] = [];
    allFamilies: ActiveFamilyDeliveries[] = [];
    maxAssignTime: number;
    getHelperPhone() {
        return this.helper.phone.displayValue;
    }
    helper: Helpers;
    escort: Helpers;
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
    async initForHelper(helper: Helpers) {
        if (helper != this.helper) {
            this.initHelper(helper);
            if (helper) {
                this.routeStats = helper.getRouteStats();
                this.prevRouteStats = undefined;
            }
        }
        await this.reload();

    }
    private async initHelper(h: Helpers) {
        this.helper = h;
        this.escort = undefined;
        if (this.helper && h.escort.value) {
            this.escort = await this.context.for(Helpers).lookupAsync(x => x.id.isEqualTo(h.escort));
        }

    }
    showBasketSummary() {
        this.context.openDialog(BasketSummaryComponent, x => x.families = this);
    }
    getLeftFamiliesDescription() {


        let boxes = 0;
        let boxes2 = 0;
        for (const iterator of this.toDeliver) {
            boxes += this.context.for(BasketType).lookup(iterator.basketType).boxes.value * iterator.quantity.value;
            boxes2 += this.context.for(BasketType).lookup(iterator.basketType).boxes2.value * iterator.quantity.value;
        }
        if (this.toDeliver.length == 0)
            return this.settings.lang.noDeliveries;
        let r = '';
        if (this.toDeliver.length == 1) {
            r = this.settings.lang.oneDeliveryToDistribute;
        }
        else
        {
            if(!this.settings.isSytemForMlt())
            r = this.toDeliver.length + ' ' + this.settings.lang.deliveriesToDistribute;
            else
            r = this.toDeliver.length + ' ' + "תורמים שמחכים לך";
        }
        if(this.settings.isSytemForMlt())
    {
        let boxesText = '';
        if (boxes != this.toDeliver.length || boxes2 != 0)
            boxesText += + boxes + ' ' + BasketType.boxes1Name;
        if (boxes2 != 0) {
            boxesText += ' ' + this.settings.lang.and + " " + boxes2 + ' ' + BasketType.boxes2Name;
        }
        if (boxesText != '')
            r += ' (' + boxesText + ')';
        }
        return r;

    }
    async initForFamilies(helper: Helpers, familiesPocoArray: any[]) {
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
        if (!this.helper.isNew()) {
            this.allFamilies = await this.context.for(ActiveFamilyDeliveries).find({
                where: f => {
                    let r = f.courier.isEqualTo(this.helper.id).and(f.deliverStatus.isActiveDelivery());
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
                    this.familiesAlreadyAssigned.set(f.id.value, true);
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
        await (await import("../asign-family/asign-family.component")).AsignFamilyComponent.RefreshRoute(this.helper.id.value, args).then(r => {

            if (r && r.ok && r.families.length == this.toDeliver.length) {
                this.setRouteStats(r.stats);
                this.initForFamilies(this.helper, r.families);
            }
        });
    }

    async initFamilies() {

        if (this.allFamilies.length > 0 && this.settings.showDistCenterAsEndAddressForVolunteer.value) {
            this.context.for(DistributionCenters).lookupAsync(this.allFamilies[0].distributionCenter).then(x => this.distCenter = x);
        }
        else {
            this.distCenter = undefined;
        }
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.ReadyForDelivery);
        if (this.toDeliver.find(f => f.routeOrder.value == 0) && this.toDeliver.length > 0) {
            this.refreshRoute({});
        }
        if (this.toDeliver.length == 0)
            this.prevRouteStats = undefined;
        this.maxAssignTime = undefined;
        for (const f of this.toDeliver) {
            if (f.courierAssingTime.value && (this.maxAssignTime == undefined || this.maxAssignTime < f.courierAssingTime.value.valueOf()))
                this.maxAssignTime = f.courierAssingTime.value.valueOf();
        }
        this.delivered = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.Success || f.deliverStatus.value == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus.value) {
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedDoNotWant:
                case DeliveryStatus.FailedOther:
                    return true;
            }
            return false;

        });
        if(this.settings.isSytemForMlt()){
        this.justFamiliesList=[];
        this.toDeliver.forEach(element => {
          let i=this.justFamiliesList.find(o=> o.family.value==element.family.value);
          if(i){
            i.baskets.push(element.basketType.value)
          }else
          {
            (<any>element).baskets=[element.basketType.value];
            this.justFamiliesList.push(element)
          }
        });
    }

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
