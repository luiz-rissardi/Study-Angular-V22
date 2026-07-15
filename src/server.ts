import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import cors from "cors";
import { randomUUID, createHash } from 'node:crypto';
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createRoutes } from './routes.server';
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { redisService } from "./redisService";

// 1. CORREÇÃO: Importando o cliente real do Redis
import { createClient } from 'redis';

dotenv.config();

export const clientRedis = createClient({
  url: process.env['REDIS_URL'] || 'redis://127.0.0.1:6379'
});

// Listener de erro global (essencial para o driver não derrubar a aplicação em erros assíncronos)
clientRedis.on('error', (err) => {
  console.error('Erro na conexão com o Redis do Docker:', err.message);
});

// Função para conectar de forma assíncrona e segura
async function conectarRedis() {
  console.log("conectando redis....");
  if (!clientRedis.isOpen) {
    try {
      await clientRedis.connect();
      console.log('Conectado ao Redis no Docker com sucesso!');
    } catch (err) {
      console.error('Não foi possível conectar ao Docker Redis. Certifique-se de que o container está rodando.');
    }
  }
}

// Inicializa a conexão
conectarRedis();

const browserDistFolder = join(import.meta.dirname, '../browser');

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env['SECRET_COOKIE']));

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function concurrencyHook(timeMs: number) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    // Busca o ID real injetado pelo autenticador ou usa um fallback caso a rota seja pública
    const userId = request.userId;

    const serializedPayload = JSON.stringify(request.body);

    const payloadHash = createHash('sha256')
      .update(`${userId}:${request.originalUrl}:${serializedPayload}`)
      .digest('hex');

    const lockKey = `req-lock:${payloadHash}`;
    let lockToken: string | null = null;

    try {
      // Tenta adquirir o lock atômico no Redis
      lockToken = await redisService.acquire(lockKey, timeMs);

      if (!lockToken) {
        //  RETORNA IMEDIATAMENTE impedindo o next()
        return response.status(409).send({ message: 'Uma requisição idêntica já está em processamento. Aguarde.' });
      }

      // Liberação quando terminar com sucesso ou falha
      response.on('finish', async () => {
        if (lockToken) await redisService.release(lockKey, lockToken);
      });

      // Liberação se o cliente cancelar a requisição/conexão cair
      response.on('close', async () => {
        if (lockToken) await redisService.release(lockKey, lockToken);
      });

      return next();
    } catch (error) {
      return next(error);
    }
  }
}
export function authenticateHook(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).send({
        error: "WITHOUT_TOKEN",
        message: "Token não fornecido"
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload: any = jwt.verify(token, process.env["JWT_SECRET"]!);
    request.userId = payload.userId;
    next();
  } catch (error: unknown) {
    switch (true) {
      case error instanceof TokenExpiredError:
        response.status(401).send({
          error: "TOKEN_EXPIRED",
          message: "Token expirado"
        });
        break;

      case error instanceof JsonWebTokenError:
        response.status(401).send({
          error: "TOKEN_INVALID",
          message: "Token inválido"
        });
        break;

      default:
        response.status(500).send({
          error: "AUTH_INTERNAL_ERROR",
          message: "Erro ao autenticar"
        });
        break;
    }
  }
}

export async function idempotencyKeyHook(request: any, response: Response, next: NextFunction) {

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    return next();
  }
  const key = request.headers['idempotency-key'];

  if (!key) {
    return response.status(400).json({ error: 'Idempotency-Key header is missing.' });
  }

  const redisKey = `idempotency:${key}`;
  try {
    // 3. CORREÇÃO: Tenta obter o lock atômico de 1 minuto (60 segundos)
    // NX: true garante que o lock só é criado se a chave NÃO existir.
    // GET: true garante que, se ela já existir, recebemos o valor atual (ex: 'PROCESSING' ou o JSON de resposta).
    const lockAcquired = await clientRedis.set(redisKey, 'PROCESSING', {
      NX: true,
      GET: true,
      EX: 60 // 1 minuto de expiração
    });

    // Se lockAcquired NÃO for null, significa que a chave já estava no Redis
    if (lockAcquired !== null) {
      const cachedValue: any = lockAcquired || "";

      if (cachedValue === 'PROCESSING') {
        return response.status(409).json({
          error: 'Another identical request is already being processed.'
        });
      }

      try {
        const savedResponse = JSON.parse(cachedValue);
        return response.status(savedResponse.status).json(savedResponse.body);
      } catch (err) {
        return;
      }
    }

    let responseBody: any;
    const originalSend = response.send;

    response.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    response.on('finish', async () => {
      try {
        let finalBody = responseBody;

        if (typeof responseBody === 'string') {
          try {
            finalBody = JSON.parse(responseBody);
          } catch {
            // Se não for JSON válido, mantém original
          }
        } else if (Buffer.isBuffer(responseBody)) {
          try {
            finalBody = JSON.parse(responseBody.toString('utf8'));
          } catch { }
        }

        const responseData = {
          status: response.statusCode,
          body: finalBody
        };

        // Salva a resposta final no Redis mantendo o TTL (tempo de vida) atual de 1 minuto
        await clientRedis.set(redisKey, JSON.stringify(responseData), {
          KEEPTTL: true
        });
      } catch (err) {
        console.error('Erro ao salvar idempotência no Redis:', err);
      }
    });

    response.on('close', async () => {
      if (!response.writableEnded) {
        try {
          await clientRedis.del(redisKey);
        } catch (err) {
          console.error('Erro ao limpar chave no evento close do Redis:', err);
        }
      }
    });

    next();
  } catch (error) {
    try {
      await clientRedis.del(redisKey);
    } catch {
      // Ignora erro de exclusão se o Redis estiver inacessível
    }
    return response.status(500).json({ error: 'Internal idempotency failure.' });
  }
}

const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['localhost', 'localhost:4000', 'your-production-domain.com']
});

export interface UserModel {
  userName: string;
  email: string;
  age: number | null;
  userType: string;
  id: string;
  password: string;
}

export const db = new Map();

createRoutes(app);

app.get("/api/user", authenticateHook, (request: AuthenticatedRequest, response) => {
  const userId = request["userId"] || null;
  const user: UserModel = db.get(userId);

  if (!user) {
    response.status(400).send("userId is not be null");
  } else {
    response.status(200).send(user);
  }
  response.end();
});

app.post("/api/user", (request, response) => {
  const user: UserModel = request.body;
  if (!user) {
    response.send({
      isSuccess: false,
      message: "user data not exist"
    });
  }
  user.id = randomUUID();
  db.set(user.id, user);

  response.send({
    userId: user.id,
    isSuccess: true,
  });
  response.end();
  return;
});

app.get('/api/findUser/:name', (req, res) => {
  const userName = req.params.name;
  const userAge = 27;

  if (userName === "Luiz") {
    res.status(200).send({
      isSuccess: true,
      userAge
    });
  } else {
    res.status(200).send({
      message: "idade de usuário inválido"
    });
  }

  res.end();
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);