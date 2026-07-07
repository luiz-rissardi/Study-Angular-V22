import { Routes } from '@angular/router';
import { FormCard } from './componets/form-card/form-card';
import { Home } from './componets/home/home';

export const routes: Routes = [
    {
        path:"form",
        component:FormCard
    },
    {
        path:"home/:userId",
        component:Home
    }
];
