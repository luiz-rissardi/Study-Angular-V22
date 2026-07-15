import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { UserFormModel } from '../componets/form-card/form-card';
import { firstValueFrom } from 'rxjs';

export interface LoginCredentials {
    userName: string;
    password: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    private httpClient = inject(HttpClient);
    private accessToken = signal<string | null>(null);
    private isAuthenticated = computed(() => this.accessToken() !== null);

    createUser(user: UserFormModel) {
        return this.httpClient.post("/api/user", user);
    }

    getToken() {
        return this.accessToken();
    }

    async login({ userName, password }: LoginCredentials) {
        const resp = await firstValueFrom(
            this.httpClient.post<any>('/auth/login', { userName, password },
                { withCredentials: true }) // necessário pro cookie ir e voltar
        );
        if (resp.accessToken) {
            this.accessToken.set(resp.accessToken);
        }
        return resp
    }

    async putUser(user: UserFormModel) {
        try {
            if (this.isAuthenticated()) {
                const resp = await firstValueFrom(
                    this.httpClient.put<any>('/user', user,
                        { withCredentials: true }) // necessário pro cookie ir e voltar
                );

                return resp
            }
        } catch (error) {
            console.log("error ao tentar mudar user: ", error);
        }
    }

    async refresh(): Promise<any> {
        const resp = await firstValueFrom(
            this.httpClient.post<{ accessToken: string }>('/auth/refresh', {}, { withCredentials: true })
        );
        this.accessToken.set(resp.accessToken);
        return resp.accessToken;
    }

    async logout() {
        await firstValueFrom(this.httpClient.post('/auth/logout', {}, { withCredentials: true }));
        this.accessToken.set(null);
    }
}
