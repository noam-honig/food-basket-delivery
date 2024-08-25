import { Component, OnInit, ViewChild, inject } from '@angular/core'
import type {
  ChartConfiguration,
  ChartData,
  ChartEvent,
  ChartType
} from 'chart.js'
import { BaseChartDirective } from 'ng2-charts'
import { BusyService, openDialog } from '../common-ui-elements'
import { WaitComponent } from '../common-ui-elements/src/angular/wait/wait.component'
import { MatDialog } from '@angular/material/dialog'
import { PieHelper } from '../delivery-follow-up/pie-helper'

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  private dialog = inject(MatDialog)
  ngOnInit(): void {}

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined
  pie = new PieHelper({})

  public pieChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  }
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [['Download', 'Sales'], ['In', 'Store', 'Sales'], 'Mail Sales'],
    datasets: [
      {
        data: [300, 500, 100]
      }
    ]
  }
  first = true
  update() {
    this.pieChartData.datasets[0].data = []

    this.pieChartData.datasets[0].data.push(
      ...[Math.random() * 100, Math.random() * 100, Math.random() * 100]
    )
    this.pieChartData.labels = ['a', 'b', 'c']

    this.pie.reset()
    this.pieChartData.datasets[0].data.forEach((d, i) => {
      this.pie.add(
        this.pieChartData.labels[i] as string,
        d,
        this.pie.usefulColors[i]
      )
    })
    this.chart?.update()
  }
}
