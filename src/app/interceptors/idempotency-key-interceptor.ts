import { HttpInterceptorFn } from '@angular/common/http';
import { IDEMPOTENCY_KEY } from '../services/shared/httpContext';

export const idempotencyKeyInterceptor: HttpInterceptorFn = (req, next) => {

  const key = req.context.get(IDEMPOTENCY_KEY);

  if (key) {
    // Clona a requisição adicionando o cabeçalho correto
    const clonedReq = req.clone({
      headers: req.headers.set('Idempotency-Key', key)
    });
    return next(clonedReq);
  }
  
  return next(req);
};
