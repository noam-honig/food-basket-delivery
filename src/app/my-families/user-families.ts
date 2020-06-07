
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType } from "../families/BasketType";
import { Helpers } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { Context } from '@remult/core';

import { translate } from '../translate';
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
            this.map.test(this.allFamilies);
    }
    startAssignByMap(city: string, group: string, distCenter: string, area: string) {

        this.map.loadPotentialAsigment(city, group, distCenter, area);
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
    getHelperPhone() {
        return this.helper.phone.displayValue;
    }
    helper: Helpers;
    escort: Helpers;
    routeStats: routeStats;
    userClickedOnFamilyOnMap: (familyId: string[]) => void = x => { };
    async initForHelper(helper: Helpers) {

        this.initHelper(helper);
        if (helper) {
            this.routeStats = helper.getRouteStats();
        }
        await this.reload();

    }
    private async  initHelper(h: Helpers) {
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
            r = translate(this.settings.lang.oneDeliveryToDistribute);
        }
        else
            r = this.toDeliver.length + ' ' + translate(this.settings.lang.deliveriesToDistribute);

        let boxesText = '';
        if (boxes != this.toDeliver.length || boxes2 != 0)
            boxesText += + boxes + ' ' + BasketType.boxes1Name;
        if (boxes2 != 0) {
            boxesText += ' ו-' + boxes2 + ' ' + BasketType.boxes2Name;
        }
        if (boxesText != '')
            r += ' (' + boxesText + ')';
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
        if (this.helper.id) {
            this.allFamilies = await this.context.for(ActiveFamilyDeliveries).find({ where: f => f.courier.isEqualTo(this.helper.id).and(f.deliverStatus.isActiveDelivery()).and(f.visibleToCourier.isEqualTo(true)), orderBy: f => [f.deliverStatus, f.routeOrder, f.address], limit: 1000 });
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

    initFamilies() {

        if (this.allFamilies.length > 0 && this.settings.showDistCenterAsEndAddressForVolunteer.value) {
            this.context.for(DistributionCenters).lookupAsync(this.allFamilies[0].distributionCenter).then(x => this.distCenter = x);
        }
        else {
            this.distCenter = undefined;
        }
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.ReadyForDelivery);
        this.delivered = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.Success || f.deliverStatus.value == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus.value) {
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedOther:
                    return true;
            }
            return false;

        });
        if (this.map)
            this.map.test(this.allFamilies);
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
