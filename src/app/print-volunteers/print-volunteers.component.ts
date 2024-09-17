import { Component, OnInit } from '@angular/core'
import { BusyService } from '../common-ui-elements'
import {
  PrintVolunteersController,
  volunteer
} from './print-volunteers.controller'

@Component({
  selector: 'app-print-volunteers',
  templateUrl: './print-volunteers.component.html',
  styleUrls: ['./print-volunteers.component.scss']
})
export class PrintVolunteersComponent implements OnInit {
  constructor(private busy: BusyService) {}
  volunteers: volunteer[] = []
  total: number = 0
  totalBaskets: number = 0
  columns: string = '2'

  ngOnInit() {
    PrintVolunteersController.volunteersForPrint().then((x) => {
      this.volunteers = x.volunteers
      this.total = x.total
      this.totalBaskets = this.volunteers.reduce((sum, v) => sum + v.quantity, 0)
    })
  }

  print() {
    window.print()
  }
}
