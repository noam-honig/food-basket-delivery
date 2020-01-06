import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';


import { Context, DataAreaSettings,  ValueListItem, DateColumn, DataControlSettings } from '@remult/core';
import { Families, GroupsColumn } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { ServerFunction } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { BasketType, BasketId } from '../families/BasketType';

import { translate } from '../translate';


@Component({
    selector: 'app-batch-operations',
    templateUrl: './batch-operations.component.html',
    styleUrls: ['./batch-operations.component.scss']
})

export class BatchOperationsComponent implements OnInit {

    constructor(private context: Context, private dialog: DialogService) {

    }
    static route: Route = {
        path: 'batch-operations',
        component: BatchOperationsComponent,
        data: { name: 'פעולות על קבוצה' }, canActivate: [AdminGuard]
    }
    static allBasketsTokenConst = '!!!';

    groupColumn = new GroupsColumn(this.context);
    basketTypeColumn = new BasketId(this.context);

    area = new DataAreaSettings();
    deliveryDate = new DateColumn("תאריך מסירה לעדכון");
    dateArea = new DataAreaSettings({ columnSettings: x => [this.deliveryDate] });


    allBasketsToken = BatchOperationsComponent.allBasketsTokenConst;

    async ngOnInit() {
        var basketTypes = await this.context.for(BasketType).find({});


        let result: DataControlSettings<any>[] = [];

        {
            let items: ValueListItem[] = [];
            let bt: DataControlSettings<any> = {
                caption: 'בחרו סוג סל',
                column: this.basketTypeColumn,
            };
            this.basketTypeColumn.value = BatchOperationsComponent.allBasketsTokenConst;
            items.push({ id: BatchOperationsComponent.allBasketsTokenConst, caption: 'כל הסלים' });
            for (const t of basketTypes) {
                items.push({ id: t.id.value, caption: t.name.value });
            }
            bt.valueList=items ;
            result.push(bt);
        }
        {
            let g: DataControlSettings<any> = this.groupColumn;
            g.caption = 'בחרו קבוצה';
            result.push(g);
        }
        this.area = new DataAreaSettings({ columnSettings: () => result });
        var d = new Date();
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
        var lastFamiliyDelivered = await this.context.for(Families).find(
            {
                where: f => f.deliverStatus.isEqualTo(DeliveryStatus.Success),
                orderBy: f => [{ column: f.deliveryStatusDate, descending: true }],
                limit: 1
            });
        if (lastFamiliyDelivered && lastFamiliyDelivered.length > 0) {
            if (lastFamiliyDelivered[0].deliveryStatusDate.value < d)
                d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        }
        this.deliveryDate.value = d;





    }
    async setNewBasket() {
        let familiesThatMatch = await BatchOperationsComponent.countNewBasket(this.basketTypeColumn.value, this.groupColumn.value);

        this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + translate(' משפחות אשר מתאימות להגדרה - האם להגדיר להן משלוח חדש?'), async () => {
            await BatchOperationsComponent.setNewBasket(this.basketTypeColumn.value, this.groupColumn.value);
            this.dialog.messageDialog('בוצע');
        });



    }
    async setAsDelivered() {
        let familiesThatMatch = await this.context.for(Families).count(f => f.onTheWayFilter());

        this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + translate(' משפחות המוגדרות בדרך - האם לעדכנן להן נמסר בהצלחה בתאריך ' + this.deliveryDate.displayValue + "?"), async () => {
            await BatchOperationsComponent.setAsOnTheWayAsDelivered(DateColumn.dateToString(this.deliveryDate.value));
            this.dialog.messageDialog('בוצע');
        });
    }
    @ServerFunction({ allowed: Roles.admin })
    static async setAsOnTheWayAsDelivered(deliveryDate: string, context?: Context) {
        let x = await context.for(Families).find({ where: f => f.onTheWayFilter() });
        let d = DateColumn.stringToDate(deliveryDate);
        for (const f of x) {
            f.deliverStatus.value = DeliveryStatus.Success;
            await f.save();
            f.deliveryStatusDate.value = d;
            await f.save();
        }

    }
    async setAsSelfPickup() {
        let familiesThatMatch = await this.context.for(Families).count(f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup));

        this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + translate(' משפחות המוגדרות כבאים לקחת - האם לעדכנן להן "קיבלו משלוח" בתאריך ' + this.deliveryDate.displayValue + "?"), async () => {
            await BatchOperationsComponent.setAsSelfPickupStatic(DateColumn.dateToString(this.deliveryDate.value));
            this.dialog.messageDialog('בוצע');
        });
    }
    @ServerFunction({ allowed: Roles.admin })
    static async setAsSelfPickupStatic(deliveryDate: string, context?: Context) {
        let x = await context.for(Families).find({ where: f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup) });
        let d = DateColumn.stringToDate(deliveryDate);
        for (const f of x) {
            f.deliverStatus.value = DeliveryStatus.SuccessPickedUp;
            await f.save();
            f.deliveryStatusDate.value = d;
            await f.save();
        }

    }


    static createFamiliesFilterForNewBasket(f: Families, basketType: string, group: string) {
        let x = f.deliverStatus.isGreaterOrEqualTo(DeliveryStatus.Success).and(
            f.deliverStatus.isDifferentFrom(DeliveryStatus.Frozen).and(
                f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)));
        if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
            x = x.and(f.basketType.isEqualTo(basketType));
        }
        if (group)
            x = x.and(f.groups.isContains(group));
        return x;
    }

    @ServerFunction({ allowed: Roles.admin })
    static async setNewBasket(basketType: string, group: string, context?: Context) {
        let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType, group) });
        for (const f of families) {
            f.setNewBasket();

            await f.save();
        }
    }
    @ServerFunction({ allowed: Roles.admin })
    static async countNewBasket(basketType: string, group: string, context?: Context) {
        return await context.for(Families).count(f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType, group));

    }
    async setAsNotInEvent() {
        let familiesThatMatch = await BatchOperationsComponent.countNotInEvent(this.basketTypeColumn.value, this.groupColumn.value);



        let onTheWayMatchingFamilies = await this.context.for(Families).count(
            f => f.onTheWayFilter().and( BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, this.basketTypeColumn.value, this.groupColumn.value)));

        let doIt = () => {
            this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + translate(' משפחות מתאימות להגדרה - האם להגדיר אותן כלא באירוע?'), async () => {
                await BatchOperationsComponent.setNotInEvent(this.basketTypeColumn.value, this.groupColumn.value);
                this.dialog.messageDialog('בוצע');
            });
        }
        if (onTheWayMatchingFamilies > 0) {
            this.dialog.YesNoQuestion('שימו לב !!! - ישנן ' + onTheWayMatchingFamilies.toString() + translate(' שמוגדרות כבדרך - אם נגדיר אותן כלא באירוע - לא ישמר שהן קיבלו סל. האם להמשיך? לחלופין אפשר לבחור באפשרות הגדר נמסר בהצלחה לכל המשפחות שבדרך'), async () => {
                await doIt();
            });

        } else
            await doIt();
    }

    static createFamiliesFilterForNotInEvent(f: Families, basketType: string, group: string) {
        let x =
            f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(
                f.deliverStatus.isDifferentFrom(DeliveryStatus.Frozen).and(
                f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)));
        if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
            x = x.and(f.basketType.isEqualTo(basketType));
        } if (group)
            x = x.and(f.groups.isContains(group));
        return x;
    }
    @ServerFunction({ allowed: Roles.admin })
    static async setNotInEvent(basketType: string, group: string, context?: Context) {
        let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType, group) });
        for (const f of families) {
            f.deliverStatus.value = DeliveryStatus.NotInEvent;
            await f.save();
        }
    }
    @ServerFunction({ allowed: Roles.admin })
    static async countNotInEvent(basketType: string, group: string, context?: Context) {
        return await context.for(Families).count(f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType, group));

    }


}
interface batchOperationsCriteria {
    group: string;
    basketType: string;
}
