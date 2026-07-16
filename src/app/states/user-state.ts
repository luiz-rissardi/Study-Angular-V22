import { Injectable, signal, WritableSignal } from '@angular/core';
import { UserDomain } from '../componets/form-card/form-card';

@Injectable({
    providedIn: 'root'
})
export class UserState {

    userState:WritableSignal<any> = signal({
        id:"",
        userName:"",
        userType:"",
        email:"",
        age:0
    });
}
