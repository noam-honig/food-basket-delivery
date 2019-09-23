
import { ColumnSetting, Entity, FilterBase, NumberColumn, IdColumn, Context, EntityClass, ColumnOptions, IdEntity, checkForDuplicateValue, StringColumn, BoolColumn, DecorateDataColumnSettings, EntityOptions } from "radweb";
import { changeDate, HasAsyncGetTheValue, PhoneColumn, DateTimeColumn } from '../model-shared/types';
import { SelectServiceInterface } from '../select-popup/select-service-interface';

import { routeStats } from '../asign-family/asign-family.component';
import { helpers } from 'chart.js';
import { Roles } from "../auth/roles";
import { JWTCookieAuthorizationHelper } from "radweb-server";
import { MatDialog } from "@angular/material";
import { SelectCompanyComponent } from "../select-company/select-company.component";


export abstract class HelpersBase extends IdEntity<HelperId>  {

    constructor(context: Context, options?: EntityOptions | string) {

        super(new HelperId(context), options);
    }

    name = new StringColumn({
        caption: "שם",
        onValidate: () => {
            if (!this.name.value || this.name.value.length < 2)
                this.name.error = 'השם קצר מידי';
        }
    });
    phone = new PhoneColumn({ caption: "טלפון", inputType: 'tel' });
    smsDate = new DateTimeColumn('מועד משלוח SMS');
    company = new CompanyColumn();
    totalKm = new NumberColumn();
    totalTime = new NumberColumn();
    shortUrlKey = new StringColumn({ includeInApi: Roles.admin });
    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm.value,
            totalTime: this.totalTime.value
        }
    }
}

@EntityClass
export class Helpers extends HelpersBase {
    static usingCompanyModule: boolean;

    constructor(private context: Context) {

        super(context, {
            name: "Helpers",
            allowApiRead: true,
            allowApiDelete: context.isSignedIn(),
            allowApiUpdate: context.isSignedIn(),
            allowApiInsert: true,
            onSavingRow: async () => {
                if (context.onServer) {
                    if (this.password.value && this.password.value != this.password.originalValue && this.password.value != Helpers.emptyPassword) {
                        this.realStoredPassword.value = Helpers.passwordHelper.generateHash(this.password.value);
                    }
                    if ((await context.for(Helpers).count()) == 0) {

                        this.admin.value = true;
                    }

                    await checkForDuplicateValue(this, this.phone);
                    if (this.isNew())
                        this.createDate.value = new Date();
                    this.veryUrlKeyAndReturnTrueIfSaveRequired();
                }
            },
            apiDataFilter: () => {
                if (!context.isSignedIn())
                    return this.id.isEqualTo("No User");
                else if (!context.isAllowed([Roles.admin]))
                    return this.id.isEqualTo(this.context.user.id);
            }
        });
    }
    public static emptyPassword = 'password';

    phone = new PhoneColumn({ caption: "טלפון", inputType: 'tel' });
    realStoredPassword = new StringColumn({
        dbName: 'password',
        includeInApi: false
    });

    password = new StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => this.realStoredPassword.value ? Helpers.emptyPassword : '' });

    createDate = new changeDate({ caption: 'מועד הוספה' });

    reminderSmsDate = new DateTimeColumn({
        caption: 'מועד משלוח תזכורת SMS'
    });
    admin = new BoolColumn({
        caption: 'מנהל משלוח',
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        dbName: 'isAdmin'
    });
    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm.value,
            totalTime: this.totalTime.value
        }
    }





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
    static recentHelpers: HelpersBase[] = [];
    static addToRecent(h: HelpersBase) {
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

    constructor(protected context: Context, settingsOrCaption?: ColumnOptions<string>) {
        super(settingsOrCaption);
    }
    getColumn(dialog: SelectServiceInterface, filter?: (helper: HelpersBase) => FilterBase): ColumnSetting<Entity<any>> {
        return {
            column: this,
            getValue: f => (f ? (<HelperId>(f).__getColumn(this)) : this).getValue(),
            hideDataOnInput: true,
            click: f => dialog.selectHelper(s => (f ? f.__getColumn(this) : this).value = (s ? s.id.value : ''), filter),
            readonly: !this.context.isAllowed(this.allowApiUpdate),
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
export class CompanyColumn extends StringColumn {
    getColumn(dialog: MatDialog) {
        return {
            column: this,
            click: f => {
                let col = f ? f.__getColumn(this) : this;
                SelectCompanyComponent.dialog(dialog, { onSelect: x => col.value = x })
            },
            width: '300'
        };
    }
    constructor() {
        super("חברה");
    }
}
export class HelperIdReadonly extends HelperId {
    allowApiUpdate = false;
    get displayValue() {
        return this.context.for(Helpers).lookup(this).name.value;
    }
}
export interface PasswordHelper {
    generateHash(password: string): string;
    verify(password: string, realPasswordHash: string): boolean;
}