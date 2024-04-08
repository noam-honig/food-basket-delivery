import { Component, OnInit } from '@angular/core'
import {
  CustomComponentArgs,
  CustomDataComponent
} from '../common-ui-elements/interfaces'

@Component({
  selector: 'app-uga-confirm-checkbox',
  templateUrl: './uga-confirm-checkbox.component.html',
  styleUrls: ['./uga-confirm-checkbox.component.scss']
})
export class UgaConfirmCheckboxComponent
  implements OnInit, CustomDataComponent
{
  constructor() {}
  args: CustomComponentArgs<any>

  ngOnInit(): void {
  
  }
}
