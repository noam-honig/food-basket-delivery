
import { ColumnSetting, Entity, FilterBase, NumberColumn, IdColumn, Context, EntityClass, DataColumnSettings, IdEntity, checkForDuplicateValue, StringColumn, BoolColumn, DecorateDataColumnSettings } from "radweb";
import { changeDate, HasAsyncGetTheValue, } from '../model-shared/types';
import { SelectServiceInterface } from '../select-popup/select-service-interface';
import { evilStatics } from '../auth/evil-statics';
import { routeStats } from '../asign-family/asign-family.component';
import { helpers } from 'chart.js';
import { Roles, RolesGroup } from "../auth/roles";
import { JWTCookieAuthorizationHelper } from "radweb-server";

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
                        this.realStoredPassword.value = Helpers.passwordHelper.generateHash(this.password.value);
                    }
                    if ((await context.for(Helpers).count()) == 0) {
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
                else if (! context.hasRole(Roles.deliveryAdmin || Roles.weeklyFamilyAdmin || Roles.weeklyFamilyPacker || Roles.weeklyFamilyVolunteer))
                    return this.id.isEqualTo(this.context.user.id);
            }
        });
    }
    public static emptyPassword = 'password';
    name = new StringColumn({
        caption: "שם",
        onValidate: v => {
            if (!v.value || v.value.length < 2)
                this.name.error = 'השם קצר מידי';
        }
    });
    phone = new StringColumn({ caption: "טלפון", inputType: 'tel' });
    realStoredPassword = new StringColumn({
        dbName: 'password',
        excludeFromApi: true
    });
    password = new StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => this.realStoredPassword.value ? Helpers.emptyPassword : '' });

    createDate = new changeDate({ caption: 'מועד הוספה' });
    smsDate = new changeDate('מועד משלוח SMS');
    reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
    deliveryAdmin = new BoolColumn({
        caption: 'מנהלת משלוח חגים',
        readonly: !this.context.hasRole(...RolesGroup.anyAdmin),
        excludeFromApi: !this.context.hasRole(...RolesGroup.anyAdmin),
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

    shortUrlKey = new StringColumn({ excludeFromApi: !this.context.hasRole(...RolesGroup.anyAdmin) });
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
        let index = Helpers.recentHelpers.findIndex(x => x.id.value == h.id.value);
        if (index >= 0)
            Helpers.recentHelpers.splice(index, 1);
        Helpers.recentHelpers.splice(0, 0, h);
    }
    static passwordHelper: PasswordHelper = {
        generateHash: x => { throw ""; },
        verify: (x, y) => { throw ""; }
    };
    static helper: JWTCookieAuthorizationHelper;

}

export class HelperId extends IdColumn implements HasAsyncGetTheValue {

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
    constructor(private myContext: Context, caption: DataColumnSettings<string, HelperId> | string) {
        super(myContext, DecorateDataColumnSettings(caption, x => x.readonly = true));
    }

    get displayValue() {
        return this.myContext.for(Helpers).lookup(this).name.value;
    }
}
export interface PasswordHelper {
    generateHash(password: string): string;
    verify(password: string, realPasswordHash: string): boolean;
}