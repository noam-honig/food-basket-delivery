import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus, Helpers } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { MapComponent } from '../map/map.component';

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
    helperOptional: Helpers;
    async initForHelper(helperId: string, helperOptional?: Helpers) {
        this.helperOptional = helperOptional;
        this.helperId = helperId;
        this.reload();
    }
    async reload() {
        var f = new Families();
        this.allFamilies = await f.source.find({ where: f.courier.isEqualTo(this.helperId) });
        this.initFamilies();
    }

    initFamilies() {
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
    }
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