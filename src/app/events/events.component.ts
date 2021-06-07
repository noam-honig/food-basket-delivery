import { Component, OnInit } from '@angular/core';
import { Context, AndFilter,  FieldDefinitionsOf, DateOnlyValueConverter } from '@remult/core';
import { BusyService, GridSettings, InputField, openDialog } from '@remult/angular';
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
import { filterDistCenter } from '../manage/distribution-centers';

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
  events = new GridSettings(this.context.for(Event), {
    allowUpdate: this.context.isAllowed(Roles.admin),
    allowInsert: this.context.isAllowed(Roles.admin),


    rowsInPage: 25,
    where: e => new AndFilter(filterDistCenter(e.distributionCenter, this.dialog.distCenter, this.context), this.showArchive ? undefined : e.eventStatus.isDifferentFrom(eventStatus.archive)),
    orderBy: e => [e.eventStatus, e.eventDate, e.startTime],
    newRow: async e =>
      e.distributionCenter = await this.dialog.getDistCenter(e.addressHelper.location()),

    showFilter: true,
    allowSelection: true,
    gridButtons: [

      {
        name: this.settings.lang.duplicateEvents,
        click: async () => {
          let archiveCurrentEvent = new InputField<boolean>({ caption: this.settings.lang.archiveCurrentEvent });
          archiveCurrentEvent.value = true;
          let date = new InputField<Date>({ caption: this.settings.lang.eventDate, valueConverter:  DateOnlyValueConverter });
          date.value = new Date();
          await openDialog(InputAreaComponent, x => x.args = {
            title: this.settings.lang.duplicateEvents,
            settings: {
              fields: () => [archiveCurrentEvent, date]
            },
            ok: async () => {
              await this.busy.doWhileShowingBusy(async () => {
                for (const current of this.events.selectedRows) {
                  let e = this.context.for(Event).create();
                  e.name = current.name;
                  e.description = current.description;
                  e.requiredVolunteers = current.requiredVolunteers;
                  e.startTime = current.startTime;
                  e.endTime = current.endTime;
                  e.eventDate = date.value;
                  e.address = current.address;
                  e.phone1 = current.phone1;
                  e.phone1Description = current.phone1Description;
                  e.distributionCenter = current.distributionCenter;
                  await e.save();
                  for (const c of await this.context.for(volunteersInEvent).find({ where: x => x.duplicateToNextEvent.isEqualTo(true).and(x.eventId.isEqualTo(current.id.value)) })) {
                    let v = this.context.for(volunteersInEvent).create();
                    v.eventId = e.id;
                    v.helper = c.helper;
                    v.duplicateToNextEvent = true;
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
          openDialog(InputAreaComponent, x => x.args = {
            title: this.settings.lang.eventInfo,
            settings: {
              fields: () => this.eventDisplayColumns(e._.repository.defs.fields)
            },
            ok: () => e.save(),
            cancel: () => e._.undoChanges(),
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
  private eventDisplayColumns(e: FieldDefinitionsOf<Event>) {
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
