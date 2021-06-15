import { Component, OnInit } from '@angular/core';
import { Families } from '../families/families';
import { BusyService, DataControlSettings, FieldCollection, getFieldDefinition, GridSettings, openDialog } from '@remult/angular';
import { Context, ServerFunction, EntityFields, EntityField, FieldDefinitions } from '@remult/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Roles } from '../auth/roles';
import { DialogService, extractError } from '../select-popup/dialog';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { checkEntityAllowed } from '@remult/core/src/remult3';

function phoneDigits(val: Phone | string) {
  let s = '';
  if (val instanceof Phone) {
    s = val.thePhone;
  }
  else s = val;
  return s.replace(/\D/g, '');
}
@Component({
  selector: 'app-merge-families',
  templateUrl: './merge-families.component.html',
  styleUrls: ['./merge-families.component.scss']
})

export class MergeFamiliesComponent implements OnInit {

  constructor(public context: Context, private dialogRef: MatDialogRef<any>, public dialog: DialogService, public settings: ApplicationSettings, public busy: BusyService) { }
  families: Families[] = [];
  family: Families;
  async ngOnInit() {
    this.families.sort((a, b) => b.createDate.valueOf() - a.createDate.valueOf());
    this.families.sort((a, b) => a.status.id - b.status.id);
    this.family = await this.context.for(Families).findId(this.families[0].id);
    this.family._disableAutoDuplicateCheck = true;
    this.rebuildCompare(true);
  }
  updateSimilarColumns(getCols: (f: EntityFields<Families>) => EntityField<any>[][]) {
    let eCols = getCols(this.family.$);

    for (const f of this.families) {
      for (const c of getCols(f.$)) {
        if (c[0].value) {
          let digits = phoneDigits(c[0].value);
          let found = false;
          for (const ec of eCols) {
            if (ec[0].value) {
              let ecDigits = phoneDigits(ec[0].value);

              if (ecDigits == digits) {
                found = true;

                for (let index = 1; index < c.length; index++) {
                  const c2 = c[index];
                  const ec2 = ec[index];
                  if (c2.value && !ec2.value)
                    ec2.value = c2.value;

                }
                break;

              }
            }
          }
          if (!found) {
            for (const ec of eCols) {
              if (!ec[0].value) {
                ec[0].value = c[0].value;

                for (let index = 1; index < c.length; index++) {
                  const c2 = c[index];
                  const ec2 = ec[index];
                  if (c2.value && !ec2.value)
                    ec2.value = c2.value;

                }
                break;
              }
            }
          }

        }

      }
    }
  }
  rebuildCompare(updateValue: boolean) {
    this.columnsToCompare.splice(0);
    if (updateValue) {

      this.updateSimilarColumns(f => [[f.tz], [f.tz2]]);
      this.updateSimilarColumns(f => [[f.phone1, f.phone1Description], [f.phone2, f.phone2Description], [f.phone3, f.phone3Description], [f.phone4, f.phone4Description]]);
    }

    for (const c of this.family.$) {
      if (c.defs.evilOriginalSettings.allowApiUpdate === undefined || checkEntityAllowed(this.context, c.defs.evilOriginalSettings.allowApiUpdate, this.family)) {
        switch (c) {
          case this.family.$.addressApiResult:
          case this.family.$.addressLatitude:
          case this.family.$.addressLongitude:
          case this.family.$.addressByGoogle:
          case this.family.$.addressOk:
          case this.family.$.drivingLongitude:
          case this.family.$.drivingLatitude:
          case this.family.$.previousDeliveryComment:
          case this.family.$.previousDeliveryDate:
          case this.family.$.previousDeliveryStatus:
          case this.family.$.nextBirthday:
          case this.family.$.city:
          case this.family.$.numOfActiveReadyDeliveries:
            continue;

        }
        for (const f of this.families) {
          if (f.$.find(c.defs).value != c.value) {
            if (!c.value && updateValue)
              c.value = f.$.find(c.defs).value;
            this.columnsToCompare.push(c.defs);
            break;
          }
        }
      }
    }
    this.cc = new FieldCollection(() => undefined, () => true, undefined, () => false, undefined);
    this.cc.add(...this.columnsToCompare.map(x => this.family.$.find(x)));


    for (const c of this.cc.items) {
      this.width.set(c.field as any, this.cc.__dataControlStyle(c));
    }

  }
  getField(map: DataControlSettings<any>): FieldDefinitions {
    return getFieldDefinition(map.field);
  }
  cc: FieldCollection;
  getColWidth(c: FieldDefinitions) {
    let x = this.width.get(c);
    if (!x)
      x = '200px';
    return x;
  }
  async updateFamily(f: Families) {
    await openDialog(UpdateFamilyDialogComponent, x => {
      x.args = { family: f, userCanUpdateButDontSave: true }
    });
    this.rebuildCompare(false);
  }
  async updateCurrentFamily() {
    await openDialog(UpdateFamilyDialogComponent, x => {
      x.args = { family: this.family, userCanUpdateButDontSave: true }
    });
    this.rebuildCompare(false);
  }
  async confirm() {
    try {
      await this.family.save();
      await MergeFamiliesComponent.mergeFamilies(this.families.map(x => x.id));
      this.merged = true;
      this.dialogRef.close();
      let deliveries = await this.context.for(ActiveFamilyDeliveries).count(fd => fd.family.isEqualTo(this.family.id).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus)))
      if (deliveries > 0) {

        await this.family.showDeliveryHistoryDialog({
          settings: this.settings,
          dialog: this.dialog,
          busy: this.busy
        });
      }
    }
    catch (err) {
      this.dialog.Error('מיזוג משפחות ' + extractError(err));
    }
  }
  merged = true;
  cancel() {
    this.dialogRef.close();
  }

  @ServerFunction({ allowed: Roles.admin })
  static async mergeFamilies(ids: string[], context?: Context) {
    let id = ids.splice(0, 1)[0];
    let newFamily = await context.for(Families).findId(id);

    for (const oldId of ids) {
      for await (const fd of context.for(FamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(oldId) })) {
        fd.family = id;
        newFamily.updateDelivery(fd);
        await fd.save();
      }
      (await context.for(Families).findId(oldId)).delete();
    }
  }


  columnsToCompare: FieldDefinitions[] = [];
  width = new Map<FieldDefinitions, string>();

}
