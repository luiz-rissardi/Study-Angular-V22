import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import cors from "cors";
import { randomUUID } from 'node:crypto';
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createRoutes } from './routes.server';
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

dotenv.config();

const browserDistFolder = join(import.meta.dirname, '../browser');

export const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env['SECRET_COOKIE']));

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateHook(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  try {
    const authHeader = request.headers.authorization; // "Bearer eyJhbG...
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).send({
        error: "WITHOUT_TOKEN",
        message: "Token não fornecido"
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload: any = jwt.verify(token, process.env["JWT_SECRET"]!);
    request.userId = payload.userId; // injeta o userId na requisição, disponível pra rota
    next(); // só chama next() quando autenticação é válida
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


const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['localhost', 'localhost:4000', 'your-production-domain.com']
});;

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 */

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
})

app.post("/api/user", (request, response) => {
  const user: UserModel = request.body;
  if (!user) {
    response.send({
      isSuccess: false,
      message: "user data not exist"
    })
  }
  user.id = randomUUID();
  db.set(user.id, user);

  response.send({
    userId: user.id,
    isSuccess: true,
  });
  response.end();
  return;
})

app.get('/api/findUser/:name', (req, res) => {
  const userName = req.params.name;
  const userAge = 27;

  if (userName === "Luiz") {
    res.status(200).send({
      isSuccess: true,
      userAge
    })
  } else {
    res.status(200).send({
      message: "idade de usuário inválido"
    })
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

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
