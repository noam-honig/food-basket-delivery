import { Component, OnInit } from '@angular/core';
import { EntityBase, EntityMetadata, IdEntity, Remult } from 'remult';
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
    for: EntityBase
  }


  changes!: ChangeLog[];
  meta!: EntityMetadata;
  async ngOnInit() {
    this.meta = this.args.for._.metadata;
    this.changes = await this.remult.repo(ChangeLog).find({ where: { relatedId: this.args.for._.getId() } });
    console.log(this.changes);
  }

}
