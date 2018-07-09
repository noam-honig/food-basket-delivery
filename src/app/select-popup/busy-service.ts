import { Injectable } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material";
import { wrapFetch } from "radweb";
import { WaitComponent } from "../wait/wait.component";

@Injectable()
export class BusyService {
    private waitRef: MatDialogRef<any>;
    async donotWait<t>(what: () => Promise<t>): Promise<t> {
        this.disableWait = true;
        try {
            return (await what());
        }
        finally {
            this.disableWait = false;
        }

    }
    private id = 0;
    private numOfWaits = 0;
    private disableWait = false;
    log(id: number, what: string) {
      //  console.log(what + ' id:' + this.id + ' w:' + this.numOfWaits);
    }
    constructor(private dialog: MatDialog) {


        wrapFetch.wrap = () => {
            let id = this.id++;
            if (this.disableWait)
                return () => { };
            this.log(id, 'start busy ');
            if (this.numOfWaits == 0) {

                setTimeout(() => {
                    
                    if (this.numOfWaits > 0&&!this.waitRef){
                        this.log(id, 'actual start busy ');
                        this.waitRef = this.dialog.open(WaitComponent, { disableClose: true });
                    }
                }, 2);

            }
            this.numOfWaits++;

            return () => {
                this.numOfWaits--;
                this.log(id, 'close busy ');
                if (this.numOfWaits == 0) {
                    this.log(id, 'close top busy ');
                    if (this.waitRef) {
                        this.log(id, 'actual close top busy ');
                        this.waitRef.close();
                        this.waitRef = undefined;
                    }
                }
            };
        };
    }
}