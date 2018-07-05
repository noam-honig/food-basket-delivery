import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { DataApiSettings, DataApi } from "radweb/utils/server/DataApi";
import { Helpers } from "../models";
import * as passwordHash from 'password-hash';
import { foreachEntityItem } from "../shared/utils";
import { Column, Entity } from "radweb";

export function helpersDataApi(r: DataApiRequest<myAuthInfo>) {

    var loggedIn = r.authInfo != undefined;
    var settings: DataApiSettings<Helpers> = {
        allowUpdate: loggedIn,
        allowDelete: loggedIn,
        allowInsert: true,
        get: {},
        readonlyColumns: h => [h.createDate, h.id],
        excludeColumns: h => [h.realStoredPassword, h.shortUrlKey],
        onSavingRow: async h => {
            if (h.password.value && h.password.value != h.password.originalValue && h.password.value != Helpers.emptyPassword) {
                h.realStoredPassword.value = passwordHash.generate(h.password.value);
            }

            await duplicateValue(h, h.phone);
            //   await duplicateValue(h,h.userName);


        },
        validate: async h => {

        }

    };

    if (!loggedIn) {
        settings.get.where = h => h.id.isEqualTo("No User")
    } else if (!r.authInfo.admin) {
        settings.get.where = h => h.id.isEqualTo(r.authInfo.helperId);
        settings.excludeColumns = h => [h.realStoredPassword, h.isAdmin, h.shortUrlKey];
    }
    else {

    }


    return new DataApi(new Helpers(), settings);
}
async function duplicateValue(row: Entity<any>, column: Column<any>, message?: string) {
    if (row.isNew() || column.value != column.originalValue) {
        let rows = await row.source.find({ where: column.isEqualTo(column.value) });
        console.log(rows.length);
        if (rows.length > 0)
            column.error = message || 'כבר קיים במערכת';
    }

}