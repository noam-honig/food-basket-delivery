import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';

export class UserFamiliesList {
    toDeliver: Families[] = [];
    delivered: Families[] = [];
    problem: Families[] = [];
    allFamilies: Families[] = [];
    async initForHelper(helperId: string) {
        var f = new Families();
        this.allFamilies = await f.source.find({ where: f.courier.isEqualTo(helperId) });
        this.initFamilies();
    }
    initFamilies() {
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.Assigned);
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
    }
    remove(f: Families) {
        this.allFamilies.splice(this.allFamilies.indexOf(f), 1);
        this.initFamilies();
    }
}