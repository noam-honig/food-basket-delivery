import { Component, OnInit } from '@angular/core'
import { Families } from '../families/families'
import {
  DataControlSettings,
  FieldCollection,
  getFieldDefinition
} from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'
import { FieldRef, FieldMetadata, FieldsRef, remult } from 'remult'
import { MatDialogRef } from '@angular/material/dialog'
import { Roles } from '../auth/roles'
import { DialogService } from '../select-popup/dialog'
import { extractError } from '../select-popup/extractError'
import {
  FamilyDeliveries,
  ActiveFamilyDeliveries
} from '../families/FamilyDeliveries'
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { Phone } from '../model-shared/phone'
import { MergeFamiliesController } from './merge-families.controller'

function phoneDigits(val: Phone | string) {
  let s = ''
  if (val instanceof Phone) {
    s = val.thePhone
  } else s = val
  return s.replace(/\D/g, '')
}
@Component({
  selector: 'app-merge-families',
  templateUrl: './merge-families.component.html',
  styleUrls: ['./merge-families.component.scss']
})
export class MergeFamiliesComponent implements OnInit {
  remult = remult
  constructor(
    private dialogRef: MatDialogRef<any>,
    public dialog: DialogService,
    public settings: ApplicationSettings,
    public busy: BusyService
  ) {}
  families: Families[] = []
  family: Families
  async ngOnInit() {
    this.families.sort(
      (a, b) => b.createDate.valueOf() - a.createDate.valueOf()
    )
    this.families.sort((a, b) => a.status.id - b.status.id)
    this.family = await remult.repo(Families).findId(this.families[0].id)
    this.family._disableAutoDuplicateCheck = true
    this.rebuildCompare(true)
  }
  updateSimilarColumns(getCols: (f: FieldsRef<Families>) => FieldRef<any>[][]) {
    let eCols = getCols(this.family.$)

    for (const f of this.families) {
      for (const c of getCols(f.$)) {
        if (c[0].value) {
          let digits = phoneDigits(c[0].value)
          let found = false
          for (const ec of eCols) {
            if (ec[0].value) {
              let ecDigits = phoneDigits(ec[0].value)

              if (ecDigits == digits) {
                found = true

                for (let index = 1; index < c.length; index++) {
                  const c2 = c[index]
                  const ec2 = ec[index]
                  if (c2.value && !ec2.value) ec2.value = c2.value
                }
                break
              }
            }
          }
          if (!found) {
            for (const ec of eCols) {
              if (!ec[0].value) {
                ec[0].value = c[0].value

                for (let index = 1; index < c.length; index++) {
                  const c2 = c[index]
                  const ec2 = ec[index]
                  if (c2.value && !ec2.value) ec2.value = c2.value
                }
                break
              }
            }
          }
        }
      }
    }
  }
  rebuildCompare(updateValue: boolean) {
    this.columnsToCompare.splice(0)
    if (updateValue) {
      this.updateSimilarColumns((f) => [[f.tz], [f.tz2]])
      this.updateSimilarColumns((f) => [
        [f.phone1, f.phone1Description],
        [f.phone2, f.phone2Description],
        [f.phone3, f.phone3Description],
        [f.phone4, f.phone4Description]
      ])
    }

    for (const c of this.family.$) {
      if (
        c.metadata.options.allowApiUpdate === undefined ||
        remult.isAllowedForInstance(
          this.family,
          c.metadata.options.allowApiUpdate
        )
      ) {
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
            continue
        }
        for (const f of this.families) {
          if (f.$.find(c.metadata).value != c.value) {
            if (!c.value && updateValue) c.value = f.$.find(c.metadata).value
            this.columnsToCompare.push(c.metadata)
            break
          }
        }
      }
    }
    this.cc = new FieldCollection(
      () => undefined,
      () => true,
      undefined,
      () => false,
      undefined
    )
    this.cc.add(...this.columnsToCompare.map((x) => this.family.$.find(x)))

    for (const c of this.cc.items) {
      this.width.set(c.field as any, this.cc.__dataControlStyle(c))
    }
  }
  getField(map: DataControlSettings<any>): FieldMetadata {
    return getFieldDefinition(map.field)
  }
  cc: FieldCollection
  getColWidth(c: FieldMetadata) {
    let x = this.width.get(c)
    if (!x) x = '200px'
    return x
  }
  async updateFamily(f: Families) {
    await openDialog(UpdateFamilyDialogComponent, (x) => {
      x.args = { family: f, userCanUpdateButDontSave: true }
    })
    this.rebuildCompare(false)
  }
  async updateCurrentFamily() {
    await openDialog(UpdateFamilyDialogComponent, (x) => {
      x.args = { family: this.family, userCanUpdateButDontSave: true }
    })
    this.rebuildCompare(false)
  }
  async confirm() {
    try {
      await this.family.save()
      await MergeFamiliesController.mergeFamilies(
        this.families.map((x) => x.id)
      )
      this.merged = true
      this.dialogRef.close()
      let deliveries = await remult
        .repo(ActiveFamilyDeliveries)
        .count({
          family: this.family.id,
          deliverStatus: DeliveryStatus.isNotAResultStatus()
        })
      if (deliveries > 0) {
        await this.family.showDeliveryHistoryDialog({
          settings: this.settings,
          ui: this.dialog
        })
      }
    } catch (err) {
      this.dialog.Error('מיזוג משפחות ' + extractError(err))
    }
  }
  merged = true
  cancel() {
    this.dialogRef.close()
  }

  columnsToCompare: FieldMetadata[] = []
  width = new Map<FieldMetadata, string>()
}
