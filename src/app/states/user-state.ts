import { Service, signal, WritableSignal } from '@angular/core';
import { UserDomain } from '../componets/form-card/form-card';

@Service()
export class UserState {

    userState:WritableSignal<UserDomain> = signal({
        id:"",
        userName:"",
        userType:"",
        email:"",
        age:0
    });
}
