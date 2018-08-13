import { Component, OnInit } from '@angular/core';
import { GridSettings, UrlBuilder } from 'radweb';
import { Families, DeliveryStatus,  BasketType } from '../families/families';
import { Helpers } from '../helpers/helpers';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { MapComponent } from '../map/map.component';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';

export class UserFamiliesList {
    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
    }
    toDeliver: Families[] = [];
    delivered: Families[] = [];
    problem: Families[] = [];
    allFamilies: Families[] = [];
    helperId: string;
    helperName: string;
    helperOptional: Helpers;
    async initForHelper(helperId: string, name: string, helperOptional?: Helpers) {
        this.helperOptional = helperOptional;
        this.helperId = helperId;
        this.helperName = name;
        await this.reload();
    }
    async initForFamilies(helperId: string, name: string, familiesPocoArray: any[]) {
        this.helperId = helperId;
        this.helperName = this.helperName;
        this.allFamilies = familiesPocoArray.map(x => this.families.source.fromPojo(x));
        this.initFamilies();
    }
    families = new Families();
    async reload() {
        this.allFamilies = await this.families.source.find({ where: this.families.courier.isEqualTo(this.helperId), orderBy: [this.families.routeOrder, this.families.address], limit: 1000 });
        this.initFamilies();
    }


    initFamilies() {
        if (1 + 1 == 0) {
            let temp = this.allFamilies;
            this.allFamilies = [];
            this.toDeliver = [];
            let lastLoc: Location = {
                lat: 32.2280236,
                lng: 34.8807046
            };
            let total = temp.length;
            for (let i = 0; i < total; i++) {
                let closest = temp[0];
                let closestIndex = 0;
                let closestDist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, closest.getGeocodeInformation().location());
                for (let j = 0; j < temp.length; j++) {
                    let dist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, temp[j].getGeocodeInformation().location());
                    if (dist < closestDist) {
                        closestIndex = j;
                        closestDist = dist;
                        closest = temp[j];
                    }
                }
                lastLoc = closest.getGeocodeInformation().location();
                this.allFamilies.push(temp.splice(closestIndex, 1)[0]);

            }
        }
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.ReadyForDelivery);
        this.delivered = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.Success);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus.listValue) {
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
            if (ff.deliverStatus.listValue != DeliveryStatus.Success) {
                let x: basketStats = hash[ff.basketType.value];
                if (!x) {
                    hash[ff.basketType.value] = this.totals[this.totals.push({
                        name: () => ff.lookup(new BasketType(), ff.basketType).name.value,
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
    }
}
export interface basketStats {
    name: () => string;
    count: number;
}