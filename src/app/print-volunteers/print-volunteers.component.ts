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
  columns: number = 2
  displayedColumns: string[] = ['name', 'quantity']

  ngOnInit() {
    PrintVolunteersController.volunteersForPrint().then((x) => {
      this.volunteers = x.volunteers
      this.total = x.total
      this.totalBaskets = this.volunteers.reduce((sum, v) => sum + v.quantity, 0)
    })
  }

  getColumns() {
    const colSize = Math.ceil(this.volunteers.length / this.columns)
    const columns = []
    for (let i = 0; i < this.columns; i++) {
      columns.push(this.volunteers.slice(i * colSize, (i + 1) * colSize))
    }
    return columns
  }

  print() {
    window.print()
  }
}
