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
    private numOfWaits = 0;
    private disableWait = false;
    constructor(private dialog: MatDialog) {
        

        wrapFetch.wrap = () => {
            if (this.disableWait)
                return () => { };
            if (this.numOfWaits == 0) {
                this.waitRef = this.dialog.open(WaitComponent, { disableClose: true });
            }
            this.numOfWaits++;

            return () => {
                this.numOfWaits--;
                if (this.numOfWaits == 0)
                    this.waitRef.close();
            };
        };
    }
}