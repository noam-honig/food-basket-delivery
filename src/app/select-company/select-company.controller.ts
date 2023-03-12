import { Component, OnInit } from '@angular/core'
import { MatDialogRef } from '@angular/material/dialog'
import { BackendMethod, SqlDatabase, remult } from 'remult'
import { Roles } from '../auth/roles'
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { Helpers } from '../helpers/helpers'
import { ApplicationSettings } from '../manage/ApplicationSettings'

export class SelectCompanyController {
  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async getCompanies() {
    var sql = new SqlBuilder()
    let h = SqlFor(remult.repo(Helpers))
    let r = await getDb().execute(
      await sql.query({
        from: h,
        select: () => [sql.build('distinct ', h.company)],
        where: () => [h.where({ company: { '>': '' } })],
        orderBy: [{ field: h.company }]
      })
    )
    return r.rows.map((x) => x.company)
  }
}
