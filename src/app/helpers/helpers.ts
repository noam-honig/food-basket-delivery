import * as radweb from 'radweb';
import { DataProviderFactory, ColumnSetting, Entity } from "radweb";
import { evilStatics } from "../auth/evil-statics";
import { IdEntity, changeDate, Id, HasAsyncGetTheValue, checkForDuplicateValue, StringColumn, BoolColumn, updateSettings } from '../model-shared/types';
import { SelectServiceInterface } from '../select-popup/select-service-interface';
import { DataApiRequest, DataColumnSettings } from 'radweb/utils/dataInterfaces1';
import { myAuthInfo } from '../auth/my-auth-info';
import { DataApiSettings, DataApi } from 'radweb/utils/server/DataApi';
import * as passwordHash from 'password-hash';
import {  ApiAccess } from '../server/api-interfaces';
import { RunOnServer } from '../auth/server-action';
import { Context, MoreDataColumnSettings } from '../shared/context';


export class Helpers extends IdEntity<HelperId>  {
    constructor(private context: Context) {

        super(new HelperId(context), Helpers, {
            apiAccess: ApiAccess.all,
            name: "Helpers",
            allowApiDelete: context.isLoggedIn(),
            allowApiUpdate: context.isLoggedIn(),
            allowApiInsert: true,
            onSavingRow: async () => {
                if (context.onServer) {
                    if (this.password.value && this.password.value != this.password.originalValue && this.password.value != Helpers.emptyPassword) {
                        this.realStoredPassword.value = passwordHash.generate(this.password.value);
                    }
                    if ((await context.for(Helpers).count()) == 0)
                        this.isAdmin.value = true;

                    await checkForDuplicateValue(this, this.phone);
                    if (this.isNew())
                        this.createDate.dateValue = new Date();
                    this.veryUrlKeyAndReturnTrueIfSaveRequired();
                }
            },
            apiDataFilter: () => {
                if (!context.isLoggedIn())
                    return this.id.isEqualTo("No User");
                else if (!context.isAdmin())
                    return this.id.isEqualTo(this.context.info.helperId);
            }
        });
        this.initColumns();
    }
    ;
    public static emptyPassword = 'password';
    name = new radweb.StringColumn({
        caption: "שם",
        onValidate: v => {
            if (!v.value || v.value.length < 3)
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
    isAdmin = new BoolColumn({
        caption: 'מנהלת',
        readonly: !this.context.isAdmin(),
        excludeFromApi: !this.context.isAdmin()
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
}





export class HelperId extends Id implements HasAsyncGetTheValue {

    constructor(private context: Context, settingsOrCaption?: DataColumnSettings<string, StringColumn> | string) {
        super(settingsOrCaption);
    }
    getColumn(dialog: SelectServiceInterface): ColumnSetting<Entity<any>> {
        return {
            column: this,
            getValue: f => (<HelperId>f.__getColumn(this)).getValue(),
            hideDataOnInput: true,
            click: f => dialog.selectHelper(s => f.__getColumn(this).value = (s ? s.id.value : '')),
            readonly: this.readonly,
            width: '200'

        }
    }

    getValue() {
        return this.context.for(Helpers).lookup(this).name.value;
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

