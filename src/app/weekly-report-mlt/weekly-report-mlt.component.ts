import { Component, OnInit, ViewChild } from '@angular/core'
import { remult } from 'remult'
import { DateRangeComponent } from '../date-range/date-range.component'
import { RegisterURL } from '../resgister-url/regsiter-url'
import { WeeklyReportMltController } from './weekly-report-mlt.controller'

@Component({
  selector: 'app-weekly-report-mlt',
  templateUrl: './weekly-report-mlt.component.html',
  styleUrls: ['./weekly-report-mlt.component.scss']
})
export class WeeklyReportMltComponent implements OnInit {
  @ViewChild(DateRangeComponent, { static: true }) dateRange: DateRangeComponent

  remult = remult

  totalPerBasket = []
  allBaskets = new Set<string>()
  donorsData = []
  volData = []

  registerUrls = new Set()
  selectedUrl = ''

  avgFamiliesPerVolunteer = '0'

  ngOnInit() {}
  ngAfterViewInit() {
    this.refresh()
  }

  async refresh() {
    RegisterURL.loadUrlsFromTables()
    this.totalPerBasket =
      await WeeklyReportMltController.getEquipmentStatusTotals(
        this.dateRange.$.fromDate.inputValue,
        this.dateRange.$.toDate.inputValue
      )
    this.allBaskets.clear()
    this.totalPerBasket.forEach((item) => {
      if (
        !this.allBaskets.has(item.baskettype) &&
        item.baskettype &&
        item.baskettype != ''
      ) {
        this.allBaskets.add(item.baskettype)
      }
    })

    this.volData = await WeeklyReportMltController.getVolunteersData(
      this.dateRange.$.fromDate.inputValue,
      this.dateRange.$.toDate.inputValue
    )
    this.donorsData = await WeeklyReportMltController.getDonorsData(
      this.dateRange.$.fromDate.inputValue,
      this.dateRange.$.toDate.inputValue
    )

    let mergedArray = [
      ...this.volData,
      ...this.donorsData,
      ...this.totalPerBasket
    ]

    mergedArray.forEach((item) => {
      if (!this.registerUrls.has(item.prettyname)) {
        this.registerUrls.add(item.prettyname)
      }
    })

    this.avgFamiliesPerVolunteer =
      await WeeklyReportMltController.getVolunteerAverage(
        this.dateRange.$.fromDate.inputValue,
        this.dateRange.$.toDate.inputValue
      )
  }

  getDonationsSummary(key: string, basket?: string, url?: string) {
    let object = this.totalPerBasket.find((item) => {
      return (
        (item.URLGroup == !url || item.prettyname == url) &&
        (item.URLGroup == !basket || item.baskettype == basket)
      )
    })
    if (!object) return 'NONE'
    return +object[key]
  }

  getDonorsData(key: string, url?: string) {
    let object = this.donorsData.find((item) => {
      return item.URLGroup == !url || item.prettyname == url
    })
    if (!object) return 'NONE'
    return +object[key]
  }

  getVolData(key: string, url?: string) {
    let object = this.volData.find((item) => {
      return item.URLGroup == !url || item.prettyname == url
    })
    if (!object) return 'NONE'
    return +object[key]
  }
}
