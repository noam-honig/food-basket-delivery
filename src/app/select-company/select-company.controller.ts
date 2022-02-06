import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Remult, BackendMethod, SqlDatabase } from 'remult';
import { Roles } from '../auth/roles';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';


export class SelectCompanyController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getCompanies(remult?: Remult, db?: SqlDatabase) {
        var sql = new SqlBuilder(remult);
        let h = SqlFor(remult.repo(Helpers));
        let r = await db.execute(await sql.query({
            from: h,
            select: () => [sql.build("distinct ", h.company)],
            where: () => [h.where({ company: { ">": '' } })],
            orderBy: [{ field: h.company }]

        }));
        return r.rows.map(x => x.company);
    }
}