import { Component, OnInit } from '@angular/core';
import { EntityMetadata, IdEntity, Remult } from 'remult';
import { ChangeLog } from './change-log';

@Component({
  selector: 'app-change-log',
  templateUrl: './change-log.component.html',
  styleUrls: ['./change-log.component.scss']
})
export class ChangeLogComponent implements OnInit {


  constructor(private remult: Remult) {

  }
  args!: {
    for: IdEntity
  }


  changes!: ChangeLog[];
  meta!: EntityMetadata;
  async ngOnInit() {
    this.changes = await this.remult.repo(ChangeLog).find({ where: { relatedId: this.args.for.id } });
    this.meta = this.args.for._.metadata;
  }

}
