import { OverviewComponent } from "../overview/overview.component";
import { ServerContext } from "@remult/core";
import { Families } from "../families/families";
import { allCentersToken } from "../manage/distribution-centers";
import { PhoneColumn } from "../model-shared/types";
import { Helpers } from "../helpers/helpers";

export async function createDonor(d: donor) {
    let context = await getMltContext();
    console.log("createDonor", JSON.stringify(d));
    let f = context.for(Families).create();
    f.name.value = d.FirstName;
    f.address.value = d.DonorStreet + " " + d.DonorCity;
    f.phone1.value = d.DonorTelephone;
    f.email.value = d.Email;
    try {
        await f.save();
        var quantity = 0;
        if (d.Donation)
            for (const item of d.Donation) {
                let q = +item.Quantity;

                if (q > 0) {
                    quantity += q;
                    let asset = '';
                    switch (item.AssetTypeID) {
                        case 1:
                            asset = 'מחשב';
                            break;
                        case 2:
                            asset = 'לפטופ';
                            break;
                        case 3:
                            asset = 'מסך';
                            break;
                    }
                    await Families.addDelivery(f.id.value, {
                        comment: '',
                        basketType: asset,
                        courier: '',
                        distCenter: allCentersToken,
                        quantity: q,
                        selfPickup: false
                    }, context);
                }
            }
        if (quantity == 0) {
            await Families.addDelivery(f.id.value, {
                comment: '',
                basketType: 'לא פורט',
                courier: '',
                distCenter: allCentersToken,
                quantity: 1,
                selfPickup: false
            }, context);
        }

    }
    catch (err) {
        console.error('donor', err);
        throw err;
    }


}
export async function createVolunteer(v: volunteer) {
    let context = await getMltContext();
    console.log("createVolunteer", JSON.stringify(v));
    try {
        v.Telephone = PhoneColumn.fixPhoneInput(v.Telephone);
        let h = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(v.Telephone));
        if (h) {
            //h.eventComment.value += ', נרשום שוב באתר ב' + new Date().toLocaleDateString();
            //await h.save();
        }
        else {
            h = context.for(Helpers).create();
            h.name.value = v.VolunteerName;
            h.phone.value = v.Telephone;
            h.preferredDistributionAreaAddress.value = v.VolunteerCity;
            h.preferredDistributionAreaAddress2.value = v.VolunteerSecondCity;
            h.eventComment.value = v.SocialSecurityID;
            h.email.value = v.VolunteerEmail;
            await h.save();
        }

    }
    catch (err) {
        console.error('volunteer', err);
        throw err;
    }

}



interface donor {
    DonorID: number;
    FirstName: string;
    DonorStreet: string;
    DonorCity: string;
    DonorTelephone: string;
    Email: string;
    InstitutionName: string;
    Donation: item[];
}
interface item {
    DonationID: number;
    DonationCategoryID: number;
    AssetTypeID: number;// 1 = desktop, 2 = laptop, 3 = screen
    Quantity: string;
    Comments: string;
}


export interface volunteer {
    VolunteerID: number;
    VolunteerName: string;
    LabID: number;
    WarehouseID: number;
    Telephone: string;
    VolunteerTypeID: number;
    VolunteerStatusID: number;
    VolunteerCity: string;
    VolunteerSecondCity: string;
    SocialSecurityID: string;
    VolunteerEmail: string;
}

async function getMltContext() {
    let db = await OverviewComponent.createDbSchema('mlt');
    let c = new ServerContext();
    c._setUser({
        id: 'WIX',
        name: 'WIX',
        roles: []
    });
    c.setDataProvider(db);
    c.setReq({
        clientIp:'wix',
        user:c.user,
        get:()=>undefined,
        getBaseUrl:()=>'/mlt',
        getHeader:()=>undefined
    });
    return c;
}
