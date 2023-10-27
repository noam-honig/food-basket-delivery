import { Component, OnInit, ViewChild } from '@angular/core'
import { remult, repo } from 'remult'
import { GridSettings, RowButton } from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'
import { Event, eventStatus } from './events'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { InputAreaComponent } from '../select-popup/input-area/input-area.component'

import { DestroyHelper, DialogService } from '../select-popup/dialog'
import * as copy from 'copy-to-clipboard'
import { getLang, Sites } from '../sites/sites'
import { Roles } from '../auth/roles'
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver'
import { EventCardComponent } from '../event-card/event-card.component'
import { use } from '../translate'

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  showArchive = false
  showPast = false
  destroyHelper = new DestroyHelper()
  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }
  constructor(
    public settings: ApplicationSettings,
    private busy: BusyService,
    private dialog: DialogService
  ) {
    dialog.onDistCenterChange(
      () => this.events.reloadData(),
      this.destroyHelper
    )
  }
  events: GridSettings<Event> = new GridSettings<Event>(remult.repo(Event), {
    allowUpdate: remult.isAllowed(Roles.admin),
    allowInsert: remult.isAllowed(Roles.admin),
    listRefreshed: () => {
      this.card.refresh()
    },

    rowsInPage: 100,
    where: () => {
      let aWeekAgo = new Date()
      aWeekAgo.setDate(aWeekAgo.getDate() - 7)
      return {
        distributionCenter: this.dialog.filterDistCenter(),
        eventStatus: !this.showArchive
          ? { '!=': eventStatus.archive }
          : undefined,
        eventDate:
          !this.showPast && !this.showArchive ? { '>=': aWeekAgo } : undefined
      }
    },
    orderBy: {
      eventStatus: 'asc',
      eventDate: 'asc',
      startTime: 'asc'
    },
    newRow: async (e) =>
      (e.distributionCenter = await this.dialog.getDistCenter(
        e.addressHelper.location
      )),
    allowSelection: true,
    gridButtons: [
      {
        name: this.settings.lang.duplicateEvents,
        click: async () => {
          await Event.duplicateEvent(
            this.dialog,
            this.events.selectedRows,
            () => {
              this.events.reloadData()
              this.events.selectedRows.splice(0)
            }
          )
        },
        visible: () => this.events.selectedRows.length > 0
      },
      {
        name: this.settings.lang.showPast,
        click: () => {
          this.showPast = !this.showPast
          this.events.reloadData()
        }
      },
      {
        name: this.settings.lang.showArchive,
        click: () => {
          this.showArchive = !this.showArchive
          this.events.reloadData()
        }
      },
      {
        name: getLang().exportToExcel,
        click: async () => {
          ;(await import('../shared/saveToExcel')).saveToExcel(
            await remult.context.getSettings(),
            remult.repo(Event),
            this.events,
            'events',
            this.dialog,
            (e, c) => c == e.$.id
          )
        }
      }
    ],
    numOfColumnsInGrid: 100,
    columnSettings: (e) => Event.displayColumns(e, this.dialog),
    rowButtons: Event.rowButtons(this.settings, this.dialog)
  })
  listOptions: RowButton<any>[] = [
    {
      name: this.settings.lang.showPast,
      click: () => {
        this.showPast = !this.showPast
        this.events.reloadData()
      }
    },
    {
      name: this.settings.lang.showArchive,
      click: () => {
        this.showArchive = !this.showArchive
        this.events.reloadData()
      }
    },

    {
      name: use.language.settings,
      icon: 'settings',
      click: async () => {
        let s = this.settings
        openDialog(
          InputAreaComponent,
          (x) =>
            (x.args = {
              title: use.language.volunteerRegistrationSettings,
              ok: async () => await s.save(),
              fields: [
                [
                  this.settings.$.questionForRegistration1Caption,
                  this.settings.$.questionForRegistration1Values
                ],
                [
                  this.settings.$.questionForRegistration2Caption,
                  this.settings.$.questionForRegistration2Values
                ],
                [
                  this.settings.$.questionForRegistration3Caption,
                  this.settings.$.questionForRegistration3Values
                ],
                [
                  this.settings.$.questionForRegistration4Caption,
                  this.settings.$.questionForRegistration4Values
                ],
                s.$.registerAskTz,
                {
                  field: s.$.registerRequireTz,
                  visible: () => s.registerAskTz
                },
                s.$.registerAskEmail,
                s.$.registerAskPreferredDistributionAreaAddress,
                s.$.registerAskPreferredFinishAddress,
                s.$.emailForVolunteerRegistrationNotification,
                s.$.donotShowEventsInGeneralList
              ]
            })
        )
      }
    }
  ]

  ngOnInit() {
    new columnOrderAndWidthSaver(this.events).load('events-component')
  }
  copyLink() {
    copy(window.origin + '/' + Sites.getOrganizationFromContext() + '/events')
    this.dialog.Info(this.settings.lang.linkCopied)
  }
  @ViewChild(EventCardComponent) card: EventCardComponent
  add() {
    const event = repo(Event).create()

    event.openEditDialog(
      this.dialog,
      () => {},
      () => {
        this.events.addNewRowToGrid(event)
        this.card.refresh()
      }
    )
  }
}
