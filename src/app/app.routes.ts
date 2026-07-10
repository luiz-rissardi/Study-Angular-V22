import { Routes } from '@angular/router';
import { FormCard } from './componets/form-card/form-card';
import { Home } from './componets/home/home';
import { Login } from './componets/login/login';
import { ChangeUser } from './componets/change-user/change-user';

export const routes: Routes = [
    {
        path:"form",
        component:FormCard
    },
    {
        path:"home",
        component:Home
    },
    {
        path:"user/change",
        component:ChangeUser
    },
    {
        path:"auth/login",
        component:Login
    }
];
