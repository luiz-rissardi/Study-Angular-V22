import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { UserFormModel } from '../componets/form-card/form-card';

@Service()
export class UserService {

    private httpClient = inject(HttpClient);

    createUser(user:UserFormModel){
        return this.httpClient.post("/api/user",user);
    }
}
