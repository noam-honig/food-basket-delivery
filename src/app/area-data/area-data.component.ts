import { Component, OnInit } from '@angular/core'
import { ErrorStateMatcher } from '@angular/material/core'
import {
  CustomComponentArgs,
  CustomDataComponent
} from '../common-ui-elements/interfaces'

@Component({
  selector: 'app-area-data',
  templateUrl: './area-data.component.html',
  styleUrls: ['./area-data.component.scss']
})
export class AreaDataComponent implements OnInit, CustomDataComponent {
  constructor() {}
  args: CustomComponentArgs

  ngOnInit(): void {}
  ngErrorStateMatches = new (class extends ErrorStateMatcher {
    constructor(public parent: AreaDataComponent) {
      super()
    }
    isErrorState() {
      return !!this.parent.args.fieldRef.error
    }
  })(this)
}
