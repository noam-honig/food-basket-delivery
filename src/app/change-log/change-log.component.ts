import { Component, OnInit } from '@angular/core'
import { EntityBase, EntityMetadata, IdEntity, remult } from 'remult'
import { ChangeLog } from './change-log'

@Component({
  selector: 'app-change-log',
  templateUrl: './change-log.component.html',
  styleUrls: ['./change-log.component.scss']
})
export class ChangeLogComponent implements OnInit {
  args!: {
    for: EntityBase
  }

  changes!: ChangeLog[]
  meta!: EntityMetadata
  async ngOnInit() {
    this.meta = this.args.for._.metadata
    this.changes = await remult
      .repo(ChangeLog)
      .find({ where: { relatedId: this.args.for._.getId().toString() } })
    console.log(this.changes)
  }
}
