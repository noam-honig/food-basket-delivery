import { Component, OnInit } from '@angular/core'
import { validSchemaName } from '../sites/sites'

import { InputAreaComponent } from '../select-popup/input-area/input-area.component'
import { DialogService } from '../select-popup/dialog'
import { extractError } from '../select-popup/extractError'
import { SiteOverviewComponent } from '../site-overview/site-overview.component'
import { BusyService, openDialog } from '../common-ui-elements'
import { actionInfo } from 'remult/internals'
import { InputField } from '../common-ui-elements/interfaces'
import {
  dateRange,
  OverviewController,
  overviewResult,
  siteItem
} from './overview.controller'
import { Fields, getFields } from 'remult'

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  constructor(private dialog: DialogService, private busy: BusyService) {}
  overview: overviewResult
  sortBy: string
  progress = 0
  spinner = true
  @Fields.dateOnly()
  fromDate: Date = new Date()
  @Fields.dateOnly()
  toDate: Date = new Date()
  @Fields.string()
  rangeName = 'טווח תאריכים'

  async ngOnInit() {
    this.overview = await OverviewController.getOverview(false)
    this.getFullState()

    this.sort()
  }
  searchString = ''

  addDateFilter = false
  get $() {
    return getFields(this)
  }
  private getFullState() {
    this.spinner = true
    this.busy.donotWait(() => {
      const z = actionInfo.startBusyWithProgress
      actionInfo.startBusyWithProgress = () => ({
        progress: (x) => (this.progress = x * 100),
        close: () => {}
      })
      return OverviewController.getOverview(
        true,
        this.addDateFilter
          ? {
              rangeName: this.rangeName,
              from: this.$.fromDate.metadata.valueConverter.toJson(
                this.fromDate
              ),
              to: this.$.fromDate.metadata.valueConverter.toJson(this.toDate)
            }
          : undefined
      )
        .then((x) => {
          this.overview = x
          this.spinner = false
          if (this.addDateFilter)
            this.doSort(x.statistics.find((x) => x.caption === this.rangeName))
          else this.sort()
        })
        .finally(() => (actionInfo.startBusyWithProgress = z))
    })
  }
  filterDates() {
    this.dialog.inputAreaDialog({
      fields: [this.$.fromDate, this.$.toDate, this.$.rangeName],
      title: 'טווח תאריכים',
      ok: () => {
        this.addDateFilter = true
        this.getFullState()
      }
    })
  }

  private sort() {
    for (const s of this.overview.sites) {
      s.lastSignIn = new Date(s.lastSignIn)
    }
    this.overview.sites.sort(
      (a, b) => b.lastSignIn?.valueOf() - a.lastSignIn?.valueOf()
    )
  }

  showSite(s: siteItem) {
    return (
      !this.searchString ||
      s.name.toLowerCase().includes(this.searchString.toLocaleLowerCase()) ||
      s.city?.toLowerCase().includes(this.searchString.toLocaleLowerCase())
    )
  }
  showSiteInfo(s: siteItem) {
    openDialog(
      SiteOverviewComponent,
      (x) => (x.args = { site: s, statistics: this.overview.statistics })
    )
  }
  doSort(s: dateRange) {
    this.sortBy = s.caption
    this.overview.sites.sort(
      (a, b) => (b.stats[s.caption] || 0) - (a.stats[s.caption] || 0)
    )
  }
  count() {
    if (!this.sortBy) return this.overview.sites.length
    return this.overview.sites.filter((x) => +x.stats[this.sortBy] > 0).length
  }

  trackBy(index: number, s: siteItem) {
    return s.site
  }
  async createNewSchema() {
    let id = new InputField<string>({ caption: 'id' })
    let name = new InputField<string>({ caption: 'שם הארגון' })
    let address = new InputField<string>({
      caption: 'כתובת מרכז חלוקה',
      customInput: (c) => c.addressInput()
    })
    let manager = new InputField<string>({ caption: 'שם מנהל' })
    let phone = new InputField<string>({ caption: 'טלפון', inputType: 'tel' })
    openDialog(
      InputAreaComponent,
      (x) =>
        (x.args = {
          title: 'הוספת סביבה חדשה',
          fields: [id, name, address, manager, phone],
          validate: async () => {
            let x = validSchemaName(id.value)
            if (x != id.value) {
              if (
                await this.dialog.YesNoPromise(
                  'המזהה כלל תוים לא חוקיים שהוסרו, האם להמשיך עם המזהה "' +
                    x +
                    '"'
                )
              ) {
                id.value = x
              } else throw 'שם לא חוקי'
            }
            id.value = validSchemaName(id.value)
            let r = await OverviewController.validateNewSchema(id.value)
            if (r) {
              throw r
            }
          },
          cancel: () => {},
          ok: async () => {
            try {
              let r = await OverviewController.createSchema(
                id.value,
                name.value,
                address.value,
                manager.value,
                phone.value
              )
              if (!r.ok) throw r.errorText
              window.open((location.href = '/' + id.value), '_blank')
              this.ngOnInit()
            } catch (err) {
              this.dialog.Error(err)
            }
          }
        })
    )
  }
}
