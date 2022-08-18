import { Component, OnInit, Injectable } from '@angular/core';
import { Email } from '../model-shared/types';
import { Phone, isPhoneValidForIsrael } from "../model-shared/phone";
import {  Controller, getFields, Validators, remult } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';

import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ActivatedRoute } from '@angular/router';
import { BackendMethod } from 'remult';
import { DataAreaSettings, DataControl } from '@remult/angular/interfaces';
import { openDialog } from '@remult/angular';

import { Field, FieldType } from '../translate';
import { FamilySources } from '../families/FamilySources';
import { BasketType } from '../families/BasketType';
import { ValueListFieldType } from 'remult/src/remult3';

@ValueListFieldType()
@DataControl({
    width: '100'
})
export class EquipmentAge {
    static OldEq = new EquipmentAge(1, '5 שנים או יותר', false);
    static NewEq = new EquipmentAge(0, 'פחות מ 5 שנים', true);
    constructor(public id: number, public caption: string, public isNew: boolean) {
    }
}

@Controller('register-donor')
export class donorForm {
    get $() { return getFields(this) }
    @Field({
        caption: "שם מלא",
        validate: Validators.required.withMessage("אנא הזן ערך")
    })
    name: string;
    @Field<donorForm, Phone>({
        caption: "טלפון",
        inputType: 'tel',
        validate: (self, col) => {
            if (!col.value || col.value.thePhone == '')
                col.error = "אנא הזן ערך";
            Phone.validatePhone(col);
        }
    })
    phone: Phone;
    @Field({
        caption: "דואל",
        inputType: 'email'
    })
    email: Email;


    @Field({ caption: "אגיע עצמאית לנקודת האיסוף" })
    selfDeliver: boolean;
    @Field<donorForm, string>({
        caption: "כתובת",
        validate: (e, col) => {
            if (!e.selfDeliver)
                Validators.required(e, col, "אנא הזן ערך");
        }
    })
    address: string;

    @Field({ caption: "מספר מחשבים נייחים" })
    computer: number;
    @Field({ caption: "גיל המחשב החדש ביותר" })
    computerAge: EquipmentAge;
    @Field({ caption: "מספר לפטופים" })
    laptop: number;
    @Field({ caption: "גיל הלפטופ החדש ביותר" })
    laptopAge: EquipmentAge;
    @Field({ caption: "מספר מסכים" })
    screen: number;
    @Field({ caption: "סוג תרומה" })
    @DataControl({
        valueList: [
            //{ id: 'ac52f4b0-6896-4ae3-8cc0-18ed17136e38', caption: 'תרומה פרטית' },
            { id: '0b9e0645-206a-457c-8785-97163073366d', caption: 'תרומת בית עסק' }]

    })
    donationType: string;
    @Field()
    docref: string;


    @BackendMethod({ allowed: true })
    async createDonor() {
        let settings = await ApplicationSettings.getAsync();
        if (!settings.isSytemForMlt)
            throw "Not Allowed";
        remult.setUser({
            id: 'WIX',
            name: 'WIX',
            roles: [],
            distributionCenter: "",
            escortedHelperName: undefined,
            theHelperIAmEscortingId: undefined
        });
        let f = remult.repo(Families).create();
        f.name = this.name;
        if (!this.address)
            this.address = '';
        f.address = this.address;
        f.phone1 = this.phone;
        f.email = this.email;
        f.custom1 = this.docref;
        f.familySource = await remult.repo(FamilySources).findId(this.donationType);

        await f.save();
        var quantity = 0;
        let self = this;
        async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
            if (q > 0) {
                quantity += q;

                await Families.addDelivery(f.id, await remult.repo(BasketType).findId(type), null, null, {
                    comment: '',
                    quantity: q,
                    selfPickup: isSelfDeliver,
                });
            }
        }
        if (this.computerAge === undefined || this.computerAge.isNew)
            await addDelivery('מחשב', this.computer, this.selfDeliver)
        else
            await addDelivery('מחשב_ישן', this.computer, this.selfDeliver);

        if (this.laptopAge === undefined || this.laptopAge.isNew)
            await addDelivery('לפטופ', this.laptop, this.selfDeliver)
        else
            await addDelivery('לפטופ_ישן', this.laptop, this.selfDeliver);

        await addDelivery('מסך', this.screen, this.selfDeliver);

        if (quantity == 0) {
            await Families.addDelivery(f.id, await remult.repo(BasketType).findId('לא פורט'), null, null, {
                comment: '',
                quantity: 1,
                selfPickup: false
            });
        }



        if (settings.registerFamilyReplyEmailText && settings.registerFamilyReplyEmailText != '') {
            let message = SendSmsAction.getMessage(settings.registerFamilyReplyEmailText,
                settings.organisationName, f.name, '', '', '');
            try {
                await f.email.Send(settings.lang.thankYouForDonation, message);
            } catch (err) {
                console.error('send mail', err);
            }
        }
    }
}