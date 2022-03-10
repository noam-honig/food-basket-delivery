import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { GridSettings } from '@remult/angular/interfaces';
import { EntityFilter, EntityOrderBy } from 'remult';
import { MatDialogRef } from '@angular/material/dialog';
import { Filter } from 'remult';
import { Remult } from 'remult';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DistributionCenters } from '../manage/distribution-centers';
import { BusyService } from '@remult/angular';


@Component({
  selector: 'app-select-family',
  templateUrl: './select-family.component.html',
  styleUrls: ['./select-family.component.scss']
})
export class SelectFamilyComponent implements OnInit {

  public args: {
    where: EntityFilter<ActiveFamilyDeliveries>,
    orderBy?: EntityOrderBy<ActiveFamilyDeliveries>,
    onSelect: (selectedValue: ActiveFamilyDeliveries[]) => void,
    selectStreet: boolean,
    distCenter: DistributionCenters,
    allowShowAll?: boolean,
    allowSelectAll?: boolean
  };
  @ViewChild("search", { static: true }) search: ElementRef;
  constructor(private busy: BusyService, private dialogRef: MatDialogRef<any>, private remult: Remult, public settings: ApplicationSettings) { }
  searchString: string = '';
  families = new GridSettings(this.remult.repo(ActiveFamilyDeliveries), { knowTotalRows: true });
  pageSize = 30;
  showAll = false;
  selectFirst() {

  }
  selected: ActiveFamilyDeliveries[] = [];
  countSelected() {
    return this.selected.length;
  }
  getSelected(f: ActiveFamilyDeliveries): hasSelectState {
    let x: any = f;
    let self = this;
    if (x.selectState === undefined) {
      x.selectState = {
        get selected() { return !!self.selected.find(y => y.id == f.id) },
        set selected(value: boolean) {
          if (f.deliverStatus.IsAResultStatus())
            return;
          if (value)
            self.selected.push(f)
          else
            self.selected.splice(self.selected.findIndex(y => y.id == f.id), 1);

        }
      }
    }
    return x;

  }


  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: {
        distributionCenter: this.remult.filterDistCenter(this.args.distCenter),
        name: this.args.selectStreet ? undefined : { $contains: this.searchString },
        address: this.args.selectStreet ? { $contains: this.searchString } : undefined,
        $and: [!this.showAll ? this.args.where : undefined]
      },
      orderBy: this.args.orderBy || { name: "asc" },
      limit: this.pageSize
    });


  }


  clearHelper() {
    this.dialogRef.close();
  }

  async doSelection() {
    if (this.selected.length > 0) {
      this.args.onSelect(this.selected);
    }
    else if (this.searchString && this.searchString.length > 0 || this.args.allowSelectAll) {

      this.pageSize = 200;
      await this.getRows();

      this.args.onSelect(this.families.items);
    }

    this.dialogRef.close();

  }

  showStatus(f: ActiveFamilyDeliveries) {
    if (f.deliverStatus == DeliveryStatus.ReadyForDelivery) {
      if (f.courier) {
        return this.settings.lang.assignedToVolunteer + " " + f.courier.name;
      } else {
        return '';
      }
    }
    return f.deliverStatus.caption;
  }
  async ngOnInit() {
    this.busy.donotWait(async () =>
      await this.getRows());
    this.search.nativeElement.focus();
  }
  moreFamilies() {
    this.families.rowsPerPage *= 2;
    this.getRows();
  }


}

interface selected {
  selected: boolean;
}
interface hasSelectState {
  selectState: selected;
}