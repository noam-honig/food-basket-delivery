import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';


import { Context, DataAreaSettings, ColumnSetting, DropDownItem } from 'radweb';
import { Families, GroupsColumn } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { RunOnServer } from 'radweb';
import { Roles, AdminGuard } from '../auth/roles';
import { BasketType, BasketId } from '../families/BasketType';
import { SelectService } from '../select-popup/select-service';


@Component({
    selector: 'app-batch-operations',
    templateUrl: './batch-operations.component.html',
    styleUrls: ['./batch-operations.component.scss']
})

export class BatchOperationsComponent implements OnInit {

    constructor(private context: Context, private dialog: DialogService, private selectService: SelectService) {

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


    allBasketsToken = BatchOperationsComponent.allBasketsTokenConst;

    async ngOnInit() {
        var basketTypes = await this.context.for(BasketType).find({});


        let result: ColumnSetting<any>[] = [];

        {
            let items: DropDownItem[] = [];
            let bt: ColumnSetting<any> = {
                caption: 'בחרו סוג סל',
                column: this.basketTypeColumn,
            };
            this.basketTypeColumn.value = BatchOperationsComponent.allBasketsTokenConst;
            items.push({ id: BatchOperationsComponent.allBasketsTokenConst, caption: 'כל הסלים' });
            for (const t of basketTypes) {
                items.push({ id: t.id.value, caption: t.name.value });
            }
            bt.dropDown = { items: items };
            result.push(bt);
        }
        {
            let g: ColumnSetting<any> = this.groupColumn.getColumn(this.selectService);
            g.caption = 'בחרו קבוצה';
            result.push(g);
        }
        this.area = new DataAreaSettings({ columnSettings: () => result });




    }
    async setNewBasket() {
        let familiesThatMatch = await BatchOperationsComponent.countNewBasket(this.basketTypeColumn.value, this.groupColumn.value);

        this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר להן משלוח חדש?', async () => {
            await BatchOperationsComponent.setNewBasket(this.basketTypeColumn.value, this.groupColumn.value);
            this.dialog.YesNoQuestion('בוצע');
        });



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

    @RunOnServer({ allowed: Roles.admin })
    static async setNewBasket(basketType: string, group: string, context?: Context) {
        let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType, group) });
        for (const f of families) {
            f.setNewBasket();

            await f.save();
        }
    }
    @RunOnServer({ allowed: Roles.admin })
    static async countNewBasket(basketType: string, group: string, context?: Context) {
        return await context.for(Families).count(f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType, group));

    }
    async setAsNotInEvent() {
        let familiesThatMatch = await BatchOperationsComponent.countNotInEvent(this.basketTypeColumn.value, this.groupColumn.value);
        this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר אותן כלא באירוע?', async () => {
            await BatchOperationsComponent.setNotInEvent(this.basketTypeColumn.value, this.groupColumn.value);
            this.dialog.YesNoQuestion('בוצע');
        });
    }

    static createFamiliesFilterForNotInEvent(f: Families, basketType: string, group: string) {
        let x =
            f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(
                f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList));
        if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
            x = x.and(f.basketType.isEqualTo(basketType));
        } if (group)
            x = x.and(f.groups.isContains(group));
        return x;
    }
    @RunOnServer({ allowed: Roles.admin })
    static async setNotInEvent(basketType: string, group: string, context?: Context) {
        let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType, group) });
        for (const f of families) {
            f.deliverStatus.value = DeliveryStatus.NotInEvent;
            await f.save();
        }
    }
    @RunOnServer({ allowed: Roles.admin })
    static async countNotInEvent(basketType: string, group: string, context?: Context) {
        return await context.for(Families).count(f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType, group));

    }


}
interface batchOperationsCriteria {
    group: string;
    basketType: string;
}
