import { Component, Input, OnInit } from '@angular/core'
import { IdEntity } from 'remult'
import { ApplicationSettings } from '../manage/ApplicationSettings'

@Component({
  selector: 'app-images',
  templateUrl: './images.component.html',
  styleUrls: ['./images.component.css']
})
export class ImagesComponent implements OnInit {
  constructor(public settings: ApplicationSettings) {}
  @Input() readonly: boolean
  @Input() images: ImageInfo[]
  ngOnInit(): void {}
  private async loadFiles(files: any) {
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      let f: File = file
      await new Promise((res) => {
        var fileReader = new FileReader()

        fileReader.onload = async (e: any) => {
          var img = new Image()

          var canvas = document.createElement('canvas')
          if (true) {
            img.onload = async () => {
              var ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0)

              var MAX_WIDTH = 800
              var MAX_HEIGHT = 600
              var width = img.width
              var height = img.height

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width
                  width = MAX_WIDTH
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height
                  height = MAX_HEIGHT
                }
              }
              canvas.width = width
              canvas.height = height
              var ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0, width, height)

              var dataurl = canvas.toDataURL('image/png')
              this.images.push({ image: dataurl })
            }
            img.src = e.target.result.toString()
          }
          //   this.image.image.value = e.target.result.toString();
          //   this.image.fileName.value = f.name;
          res({})
        }
        fileReader.readAsDataURL(f)
      })
    }
  }

  onFileInput(e: any) {
    this.loadFiles(e.target.files)
  }
}

export interface ImageInfo {
  image: string
  deleted?: boolean
  new?: boolean
  entity?: IdEntity
}
