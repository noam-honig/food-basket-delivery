import * as radweb from 'radweb';
import { BoolColumn, DataProviderFactory, ColumnSetting, Entity } from "radweb";
import { evilStatics } from "../auth/evil-statics";
import { IdEntity, changeDate, Id, HasAsyncGetTheValue, checkForDuplicateValue } from '../model-shared/types';
import { SelectServiceInterface } from '../select-popup/select-service-interface';
import { DataApiRequest } from 'radweb/utils/dataInterfaces1';
import { myAuthInfo } from '../auth/my-auth-info';
import { DataApiSettings, DataApi } from 'radweb/utils/server/DataApi';
import * as passwordHash from 'password-hash';
import { entityWithApi, entityApiSettings, ApiAccess } from '../server/api-interfaces';
import { RunOnServer } from '../auth/server-action';


export class Helpers extends IdEntity<HelperId> implements entityWithApi {

    public static emptyPassword = 'password';
    name = new radweb.StringColumn({
        caption: "שם",
        onValidate: v => {
            if (!v.value || v.value.length < 3)
                this.name.error = 'השם קצר מידי';
        }
    });
    phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });
    realStoredPassword = new radweb.StringColumn({ dbName: 'password' });
    password = new radweb.StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => this.realStoredPassword.value ? Helpers.emptyPassword : '' });

    createDate = new changeDate('מועד הוספה');
    smsDate = new changeDate('מועד משלוח SMS');
    reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
    isAdmin = new BoolColumn('מנהלת');
    shortUrlKey = new radweb.StringColumn();

    constructor(factory?: () => Helpers, name?: string, source?: DataProviderFactory) {

        super(new HelperId(), factory ? factory : () => new Helpers(), source ? source : evilStatics.dataSource, {
            name: name ? name : "Helpers",
            dbName: "Helpers"

        });
        this.initColumns();
        let x = this.onSavingRow;
        this.onSavingRow = () => {
            if (this.isNew())
                this.createDate.dateValue = new Date();
            this.veryUrlKeyAndReturnTrueIfSaveRequired();
            x();
        };
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
    getDataApiSettings(): entityApiSettings {
        return {
            apiAccess: ApiAccess.all,
            apiSettings: authInfo => {
                var loggedIn = authInfo != undefined;
                var settings: DataApiSettings<this> = {
                    allowUpdate: loggedIn,
                    allowDelete: loggedIn,
                    allowInsert: true,
                    get: {},
                    readonlyColumns: h => [h.createDate, h.id],
                    excludeColumns: h => [h.realStoredPassword],
                    onSavingRow: async h => {
                        if (h.password.value && h.password.value != h.password.originalValue && h.password.value != Helpers.emptyPassword) {
                            h.realStoredPassword.value = passwordHash.generate(h.password.value);
                        }
                        if ((await h.source.count()) == 0)
                            h.isAdmin.value = true;

                        await checkForDuplicateValue(h, h.phone);
                    },

                };

                if (!loggedIn) {
                    settings.get.where = h => h.id.isEqualTo("No User")
                } else if (!authInfo.admin) {
                    settings.get.where = h => h.id.isEqualTo(authInfo.helperId);
                    settings.excludeColumns = h => [h.realStoredPassword, h.isAdmin, h.shortUrlKey];
                }
                return settings;
            }
        };
    }
    
    static async testIt(name: string, id: Number) {
        console.log("i'm running on the server ",name,id);
        return 7;
    }
}





export class HelperId extends Id implements HasAsyncGetTheValue {

    getColumn(dialog: SelectServiceInterface): ColumnSetting<Entity<any>> {
        return {
            column: this,
            getValue: f => (<HelperId>f.__getColumn(this)).getValue(),
            hideDataOnInput: true,
            click: f => dialog.selectHelper(s => f.__getColumn(this).value = s.id.value),
            readonly: this.readonly,
            width: '200'

        }
    }
    getValue() {
        return this.lookup(new Helpers()).name.value;
    }
    async getTheName() {
        let r = await this.lookupAsync(new Helpers(), this);
        if (r && r.name && r.name.value)
            return r.name.value;
        return '';
    }
    async getTheValue() {
        let r = await this.lookupAsync(new Helpers(), this);
        if (r && r.name && r.name.value && r.phone)
            return r.name.value + ' ' + r.phone.value;
        return '';
    }
}

export class HelperIdReadonly extends HelperId {
    constructor(caption: string) {
        super({
            caption: caption,
            readonly: true
        });
    }
    get displayValue() {
        return this.lookup(new Helpers()).name.value;
    }
}

