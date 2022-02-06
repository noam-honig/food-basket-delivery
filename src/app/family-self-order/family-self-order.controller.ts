import { DataAreaSettings, DataControl, getValueList } from '@remult/angular/interfaces';
import { BackendMethod, Controller, getFields, Remult } from 'remult';
import { BasketType } from '../families/BasketType';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';
import { getSettings } from '../manage/ApplicationSettings';
import { Field } from '../translate';

@Controller('family-self-order')
export class FamilySelfOrderController {

    constructor(protected remult: Remult) { }
    @Field()
    familyUrl: string = 'dcf37b47-603b-44a1-ae15-d021f3003537';

    @Field()
    familyName: string = '';

    @Field({ caption: 'סוג מזון' })
    @DataControl({
        valueList: async (remult: Remult) => getValueList(remult.repo(BasketType))
    })
    basket: string;

    @DataControl({
        valueList: [{ id: '', caption: 'ללא' }, ...['NB', '1', '2', '3', '4', '4+', '5', '6'].map(item => ({
            id: 'טיטולים ' + item,
            caption: item
        }))]
    })
    @Field({ caption: 'מידת טיטולים' })
    titulim: string = '';

    @Field({ caption: 'גרבר' })
    gerber: boolean;

    @Field({ caption: 'דייסה' })
    daisa: boolean;

    @Field({ caption: 'הערה' })
    comment: string;

    @Field()
    message: string = '';

    get $() {
        return getFields(this);
    }
    area = new DataAreaSettings({
        fields: () => [
            this.$.basket,
            this.$.titulim,
            this.$.gerber,
            this.$.daisa,
            this.$.comment
        ]
    })

    @BackendMethod({ allowed: (remult, self) => getSettings(remult).familySelfOrderEnabled })
    async load() {
        let f = await this.loadFamily();
        if (!f)
            return;
        this.familyName = f.name;
    }
    @BackendMethod({ allowed: (remult, self) => getSettings(remult).familySelfOrderEnabled })
    async update() {
        let f = await this.loadFamily();
        if (!f)
            return;
        let fd = f.createDelivery(undefined);
        fd.basketType = await this.remult.repo(BasketType).findId(this.basket);
        fd.deliveryComments = '';

        for (const what of [this.titulim, this.gerber ? "גרבר" : "", this.daisa ? "דיסה" : "", this.comment]) {
            if (what) {
                if (fd.deliveryComments.length > 0)
                    fd.deliveryComments += ", ";
                fd.deliveryComments += what;
            }
        }
        await fd.save();
        this.message = "המשלוח עודכן, יום מקסים";

    }

    async loadFamily() {
        let f = await this.remult.repo(Families).findFirst({ shortUrlKey: this.familyUrl, status: FamilyStatus.Active });
        if (!f) {
            this.message = "לא נמצא";
            return;
        }
        if (await this.remult.repo(ActiveFamilyDeliveries).count({ family: f.id })) {
            this.message = "המשלוח כבר מעודכן במערכת, לשינוי נא ליצור קשר טלפוני";
            return;
        }
        return f;
    }


}
