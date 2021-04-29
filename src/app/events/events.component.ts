import { Component, OnInit } from '@angular/core';
import { Context, BoolColumn, DateColumn, AndFilter } from '@remult/core';
import { BusyService } from '@remult/angular';
import { Event, volunteersInEvent, eventStatus } from './events';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Helpers } from '../helpers/helpers';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';


import { DestroyHelper, DialogService } from '../select-popup/dialog';
import * as copy from 'copy-to-clipboard';
import { Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  showArchive = false;
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  constructor(private context: Context, public settings: ApplicationSettings, private busy: BusyService, private dialog: DialogService) {
    dialog.onDistCenterChange(() => this.events.reloadData(), this.destroyHelper);
  }
  events = this.context.for(Event).gridSettings({
    allowUpdate: this.context.isAllowed(Roles.admin),
    allowInsert: this.context.isAllowed(Roles.admin),


    rowsInPage: 25,
    where: e => new AndFilter(e.distributionCenter.filter(this.dialog.distCenter.value),this.showArchive ? undefined : e.eventStatus.isDifferentFrom(eventStatus.archive)),
    orderBy: e => [e.eventStatus, e.eventDate, e.startTime],
    newRow: async e =>
      e.distributionCenter.value = await this.dialog.getDistCenter(e.address.location()),

    showFilter: true,
    allowSelection: true,
    gridButtons: [

      {
        name: this.settings.lang.duplicateEvents,
        click: async () => {
          let archiveCurrentEvent = new BoolColumn(this.settings.lang.archiveCurrentEvent);
          archiveCurrentEvent.value = true;
          let date = new DateColumn(this.settings.lang.eventDate);
          date.value = new Date();
          await this.context.openDialog(InputAreaComponent, x => x.args = {
            title: this.settings.lang.duplicateEvents,
            settings: {
              columnSettings: () => [archiveCurrentEvent, date]
            },
            ok: async () => {
              await this.busy.doWhileShowingBusy(async () => {
                for (const current of this.events.selectedRows) {
                  let e = this.context.for(Event).create();
                  e.name.value = current.name.value;
                  e.description.value = current.description.value;
                  e.requiredVolunteers.value = current.requiredVolunteers.value;
                  e.startTime.value = current.startTime.value;
                  e.endTime.value = current.endTime.value;
                  e.eventDate.rawValue = date.rawValue;
                  e.address.value = current.address.value;
                  e.phone1.value = current.phone1.value;
                  e.phone1Description.value = current.phone1Description.value;
                  e.distributionCenter.value = current.distributionCenter.value;
                  await e.save();
                  for (const c of await this.context.for(volunteersInEvent).find({ where: x => x.duplicateToNextEvent.isEqualTo(true).and(x.eventId.isEqualTo(current.id.value)) })) {
                    let v = this.context.for(volunteersInEvent).create();
                    v.eventId.value = e.id.value;
                    v.helper.value = c.helper.value;
                    v.duplicateToNextEvent.value = true;
                    await v.save();

                  }
                  if (archiveCurrentEvent.value) {
                    current.eventStatus.value = eventStatus.archive;
                    await current.save();
                  }
                }
                this.events.reloadData();
              });
            }
          });
        }
        , visible: () => this.events.selectedRows.length > 0

      },
      {
        name: this.settings.lang.showArchive,
        click: () => {
          this.showArchive = !this.showArchive;
          this.events.reloadData();
        }
      },
    ],
    numOfColumnsInGrid: 100,
    columnSettings: e => this.eventDisplayColumns(e),
    rowButtons: [
      {
        name: this.settings.lang.eventInfo,
        click: async e => {
          this.context.openDialog(InputAreaComponent, x => x.args = {
            title: this.settings.lang.eventInfo,
            settings: {
              columnSettings: () => this.eventDisplayColumns(e)
            },
            ok: () => e.save(),
            cancel: () => e.undoChanges(),
            buttons: [
              {
                text: this.settings.lang.volunteers,
                click: () => e.showVolunteers(this.dialog, this.busy)
              }
            ]
          });
        }
      },
      {
        name: this.settings.lang.volunteers,
        click: async e => {
          e.showVolunteers(this.dialog, this.busy)
        }
      }
    ]
  });
  private eventDisplayColumns(e: Event) {
    return [
      e.name,
      { width: '100', column: e.registeredVolunteers },
      { width: '100', column: e.requiredVolunteers },
      { width: '150', column: e.eventDate },
      e.startTime,
      e.endTime,
      { width: '150', column: e.eventStatus },
      e.description,
      e.distributionCenter,
      e.address,
      e.phone1,
      e.phone1Description
    ];
  }

  ngOnInit() {
    new columnOrderAndWidthSaver(this.events).load('events-component');
  }
  copyLink() {
    copy(window.origin + '/' + Sites.getOrganizationFromContext(this.context) + '/my-families');
    this.dialog.Info(this.settings.lang.linkCopied);
  }

}
