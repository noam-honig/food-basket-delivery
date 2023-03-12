import { Component, OnInit, ViewChild } from '@angular/core'
import { openDialog } from '../common-ui-elements'
import { EditCustomMessageComponent } from '../edit-custom-message/edit-custom-message.component'

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  a: string = 'asdf'
  ngOnInit() {
    setTimeout(() => {
      openDialog(EditCustomMessageComponent)
    }, 100)
  }
}
