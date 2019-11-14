import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType } from "../families/BasketType";
import { Helpers } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { Context } from 'radweb';
import { routeStats } from '../asign-family/asign-family.component';
import { translate } from '../translate';
import { ElementRef } from '@angular/core';
import { PhoneColumn } from '../model-shared/types';

export class UserFamiliesList {
    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
        this.map.userClickedOnFamilyOnMap = (f) => this.userClickedOnFamilyOnMap(f);
    }
    startAssignByMap(city: string, group: string) {
        
        this.map.loadPotentialAsigment(city, group);
        setTimeout(() => {
            this.map.gmapElement.nativeElement.scrollIntoView();
        }, 100);
    }

    constructor(private context: Context) { }
    toDeliver: Families[] = [];
    delivered: Families[] = [];
    problem: Families[] = [];
    allFamilies: Families[] = [];
    helperId: string;
    helperName: string;
    private helperPhone:string;
    getHelperPhone(){
        return PhoneColumn.formatPhone(this.helperPhone);
    }
    helperOptional: Helpers;
    routeStats: routeStats;
    userClickedOnFamilyOnMap: (familyId: string[]) => void = x => { };
    async initForHelper(helperId: string, name: string,phone:string, helperOptional?: Helpers) {

        this.helperOptional = helperOptional;
        this.helperId = helperId;
        this.helperName = name;
        this.helperPhone = phone;
        if (helperOptional) {
            this.routeStats = helperOptional.getRouteStats();
        }
        await this.reload();

    }
    getLeftFamiliesDescription() {


        let boxes = 0;
        let boxes2 = 0;
        for (const iterator of this.toDeliver) {
            boxes += this.context.for(BasketType).lookup(iterator.basketType).boxes.value;
            boxes2 += this.context.for(BasketType).lookup(iterator.basketType).boxes2.value;
        }
        if (this.toDeliver.length == 0)
            return 'שומר מקום';
        let r = '';
        if (this.toDeliver.length == 1) {
            r = translate('משפחה אחת לחלוקה');
        }
        else
            r = this.toDeliver.length + translate(' משפחות לחלוקה');

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
    async initForFamilies(helperId: string, name: string,phone:string, familiesPocoArray: any[]) {
        this.helperId = helperId;
        this.helperName = name;
        this.helperPhone = phone;
        let newFamilies = familiesPocoArray.map(x => this.context.for(Families).create().source.fromPojo(x));
        newFamilies.push(...this.delivered);
        newFamilies.push(...this.problem);
        this.allFamilies = newFamilies;
        this.initFamilies();
    }
    familiesAlreadyAssigned = new Map<string, boolean>();
    highlightNewFamilies = false;
    lastHelperId = undefined;
    async reload() {
        if (this.helperId) {
            this.allFamilies = await this.context.for(Families).find({ where: f => f.courier.isEqualTo(this.helperId).and(f.deliverStatus.isActiveDelivery()).and(f.visibleToCourier.isEqualTo(true)), orderBy: f => [f.routeOrder, f.address], limit: 1000 });
            if (this.lastHelperId != this.helperId) {
                this.lastHelperId = this.helperId;
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


    initFamilies() {

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
        this.totals = [];
        this.allFamilies.forEach(ff => {
            if (ff.deliverStatus.value != DeliveryStatus.Success && ff.deliverStatus.value != DeliveryStatus.SuccessLeftThere) {
                let x: basketStats = hash[ff.basketType.value];
                if (!x) {
                    hash[ff.basketType.value] = this.totals[this.totals.push({
                        name: () => this.context.for(BasketType).lookup(ff.basketType).name.value,
                        count: 1
                    }) - 1];
                }
                else {
                    x.count++;
                }
            }

        });

    }
    totals: basketStats[] = [];
    remove(f: Families) {
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



    }
}
export interface basketStats {
    name: () => string;
    count: number;
}