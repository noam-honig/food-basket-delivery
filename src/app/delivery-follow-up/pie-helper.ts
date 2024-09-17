import { NgZone, inject } from '@angular/core'
import type { ChartConfiguration, ChartData } from 'chart.js'
import { colors } from '../families/stats-action'

export class PieHelper {
  constructor(
    private args: {
      click?: (index: number) => void
    }
  ) {}
  private z = inject(NgZone)
  public chartClicked(e: any): void {
    this.z.run(() => {
      if (e.active && e.active.length > 0) {
        this.args?.click(e.active[0].index)
      }
    })
  }
  public options: ChartConfiguration['options'] = {
    layout: {
      padding: {
        top: 0,
        bottom: 0
      }
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        onClick: (_, legendItem) => {
          this.z.run(() => {
            this.args.click?.(legendItem.index)
          })
        },
        labels: {
          textAlign: 'right'
        }
      }
    }
  }
  private colors: string[] = []
  reset() {
    this.data.datasets[0].data = []
    this.data.labels.splice(0)
    this.colors.splice(0)
  }
  usefulColors = [
    colors.green,
    colors.blue,
    colors.yellow,
    colors.red,
    colors.orange,
    colors.gray
  ]

  add(label: string, value: number, color: string) {
    this.data.datasets[0].data.push(value)
    this.data.labels.push(label)
    if (!color) {
      color = this.usefulColors[this.colors.length % this.usefulColors.length]
    }
    this.colors.push(color)
  }
  public data: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: this.colors
      }
    ]
  }
}
