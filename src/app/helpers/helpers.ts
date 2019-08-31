import * as radweb from 'radweb';
import { ColumnSetting, Entity, FilterBase, NumberColumn } from "radweb";
import { IdEntity, changeDate, Id, HasAsyncGetTheValue, checkForDuplicateValue, StringColumn, BoolColumn, updateSettings } from '../model-shared/types';
import { SelectServiceInterface } from '../select-popup/select-service-interface';
import { DataColumnSettings } from 'radweb';

import { Context, MoreDataColumnSettings, EntityClass } from '../shared/context';
import { evilStatics } from '../auth/evil-statics';
import { routeStats } from '../asign-family/asign-family.component';
import { helpers } from 'chart.js';

@EntityClass
export class Helpers extends IdEntity<HelperId>  {

    constructor(private context: Context) {

        super(new HelperId(context), {
            name: "Helpers",
            allowApiRead: true,
            allowApiDelete: context.isLoggedIn(),
            allowApiUpdate: context.isLoggedIn(),
            allowApiInsert: true,
            onSavingRow: async () => {
                if (context.onServer) {
                    if (this.password.value && this.password.value != this.password.originalValue && this.password.value != Helpers.emptyPassword) {
                        this.realStoredPassword.value = evilStatics.passwordHelper.generateHash(this.password.value);
                    }
                    if ((await context.for(Helpers).count()) == 0){
                        this.superAdmin.value = true;
                        this.deliveryAdmin.value = true;
                    }

                    await checkForDuplicateValue(this, this.phone);
                    if (this.isNew())
                        this.createDate.value = new Date();
                    this.veryUrlKeyAndReturnTrueIfSaveRequired();
                }
            },
            apiDataFilter: () => {
                if (!context.isLoggedIn())
                    return this.id.isEqualTo("No User");
                else if (!(context.info.deliveryAdmin || context.info.weeklyFamilyAdmin || context.info.weeklyFamilyPacker || context.info.weeklyFamilyVolunteer))
                    return this.id.isEqualTo(this.context.info.helperId);
            }
        });
    }
    public static emptyPassword = 'password';
    name = new radweb.StringColumn({
        caption: "שם",
        onValidate: v => {
            if (!v.value || v.value.length < 2)
                this.name.error = 'השם קצר מידי';
        }
    });
    phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });
    realStoredPassword = new StringColumn({
        dbName: 'password',
        excludeFromApi: true
    });
    password = new radweb.StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => this.realStoredPassword.value ? Helpers.emptyPassword : '' });

    createDate = new changeDate({ caption: 'מועד הוספה' });
    smsDate = new changeDate('מועד משלוח SMS');
    reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
    deliveryAdmin = new BoolColumn({
        caption: 'מנהל משלוח',
        readonly: !this.context.isAdmin(),
        excludeFromApi: !this.context.isAdmin(),
        dbName: 'isAdmin'
    });
    totalKm = new NumberColumn();
    totalTime = new NumberColumn();
    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm.value,
            totalTime: this.totalTime.value
        }
    }
    generalSmsDate = new changeDate('מועד משלוח SMS כללי אחרון');
    declineSms = new BoolColumn('מסרב לקבל הודעות SMS');

    superAdmin = new BoolColumn({
        caption: 'סופר מנהל'
    });
    weeklyFamilyAdmin = new BoolColumn({
        caption: 'מנהלת משלוחים שבועיים'
    });
    weeklyFamilyPacker = new BoolColumn({
        caption: 'אורזת משלוחים שבועיים'
    });
    deliveryVolunteer = new BoolColumn({
        caption: 'מתנדב משלוח חגים'
    });
    weeklyFamilyVolunteer = new BoolColumn({
        caption: 'מתנדבת משלוחים שבועיים'
    });

    shortUrlKey = new StringColumn({ excludeFromApi: !this.context.isAdmin() });
    veryUrlKeyAndReturnTrueIfSaveRequired() {
        if (!this.shortUrlKey.value) {
            this.shortUrlKey.value = this.makeid();
            return true;
        }
        return false;
    }
    makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    static recentHelpers: Helpers[] = [];
    static addToRecent(h: Helpers) {
        if (!h)
            return;
        if (h.isNew())
            return;
        let index = Helpers.recentHelpers.findIndex(x=>x.id.value==h.id.value);
        if (index >= 0)
            Helpers.recentHelpers.splice(index, 1);
        Helpers.recentHelpers.splice(0, 0, h);
    }

}

export class HelperId extends Id implements HasAsyncGetTheValue {

    constructor(private context: Context, settingsOrCaption?: DataColumnSettings<string, StringColumn> | string) {
        super(settingsOrCaption);
    }
    getColumn(dialog: SelectServiceInterface, filter?: (helper: Helpers) => FilterBase): ColumnSetting<Entity<any>> {
        return {
            column: this,
            getValue: f => (f ? (<HelperId>(f).__getColumn(this)) : this).getValue(),
            hideDataOnInput: true,
            click: f => dialog.selectHelper(s => (f ? f.__getColumn(this) : this).value = (s ? s.id.value : ''), filter),
            readonly: this.readonly,
            width: '200'

        }
    }

    getValue() {
        return this.context.for(Helpers).lookup(this).name.value;
    }
    getPhone() {
        return this.context.for(Helpers).lookup(this).phone.value;
    }
    async getTheName() {
        let r = await this.context.for(Helpers).lookupAsync(this);
        if (r && r.name && r.name.value)
            return r.name.value;
        return '';
    }
    async getTheValue() {
        let r = await this.context.for(Helpers).lookupAsync(this);
        if (r && r.name && r.name.value && r.phone)
            return r.name.value + ' ' + r.phone.value;
        return '';
    }
}

export class HelperIdReadonly extends HelperId {
    constructor(private myContext: Context, caption: MoreDataColumnSettings<string, HelperId> | string) {
        super(myContext, updateSettings(caption, x => x.readonly = true));
    }

    get displayValue() {
        return this.myContext.for(Helpers).lookup(this).name.value;
    }
}