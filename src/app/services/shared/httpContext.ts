import { HttpContextToken } from '@angular/common/http';

// Criamos o token que armazenará a string da nossa chave (ou null se não for necessária)
export const IDEMPOTENCY_KEY = new HttpContextToken<string | null>(() => null);