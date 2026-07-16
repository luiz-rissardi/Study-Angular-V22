import { Application } from "express";
import { AuthenticatedRequest, authenticateHook, concurrencyHook, db, idempotencyKeyHook, UserModel } from "./server";
import jwt from "jsonwebtoken";
import { PaymentData } from "./app/componets/payment/payment";

const data: any = [];

export function createRoutes(app: Application) {

    // 1. INITIATE: Agora usa a chave de idempotência vinda do cliente para evitar a criação de múltiplos tokens
    app.post("/payment/initiate", authenticateHook, concurrencyHook(5000), (request, response) => {
        const { amount, destination, userId } = request.body;

        const payload = {
            sub: userId,
            amount,
            destination,
        };

        const idempotencyToken = jwt.sign(payload, process.env["JWT_SECRET"]!, { expiresIn: '2m' });

        return response.status(200).json({ idempotencyToken });
    });

    // 2. CONFIRM: Executa o processo pesado travando concorrência pela chave do token
    app.post("/payment/confirm", authenticateHook, idempotencyKeyHook, async (request, response) => {
        const paymentData: PaymentData = request.body;

        // Simulação de delay de processamento
        await new Promise(resolve => setTimeout(resolve, 5000));

        data.push(paymentData);

        console.log(data);
        return response.status(200).send({ success: true, message: "operação feita com sucesso!" });
    });

    // 3. AUTH LOGIN: Removido o response.end() duplicado do finally
    app.post("/auth/login", (request, response) => {
        try {
            const { userName, password } = request.body as UserModel;
            let user: UserModel = {
                userName: "", email: "", age: null, userType: "", id: "", password: ""
            };

            db.forEach((el: UserModel) => {
                if (el.userName == userName && password == el.password) {
                    user = el;
                }
            });

            if (user.id === "") {
                return response.status(401).send("Invalid Credentials!");
            }

            const accessToken = jwt.sign({ userId: user.id }, process.env["JWT_SECRET"]!, { expiresIn: '15min' });
            const refreshToken = jwt.sign({ userId: user.id }, process.env["REFRESH_SECRET"]!, { expiresIn: '7d' });

            response.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                signed: true,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return response.send({ accessToken, userId: user.id });

        } catch (error) {
            console.error(error);
            return response.status(500).send("Internal server error");
        }
    });

    // 4. USER UPDATE
    app.put("/user", authenticateHook, (request: AuthenticatedRequest, response) => {
        try {
            const newUserData: UserModel = request.body;
            const userId = request.userId;

            if (newUserData.userName !== "") {
                db.delete(userId);
                db.set(userId, { ...newUserData });
            }

            return response.status(200).send({ ...newUserData });
        } catch (error) {
            return response.status(500).send("Internal server error");
        }
    });

    // 5. AUTH REFRESH
    app.post("/auth/refresh", (request, response) => {
        const refreshToken = request.signedCookies.refreshToken;
        if (!refreshToken) {
            return response.status(401).json({ erro: 'Sem refresh token' });
        }

        try {
            const payload = jwt.verify(refreshToken, process.env["REFRESH_SECRET"]!) as { userId: string };
            const newAccessToken = jwt.sign({ userId: payload.userId }, process.env["JWT_SECRET"]!, { expiresIn: '15m' });
            const newRefreshToken = jwt.sign({ userId: payload.userId }, process.env["REFRESH_SECRET"]!, { expiresIn: '7d' });

            response.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                signed: true,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return response.send({ accessToken: newAccessToken });
        } catch (error) {
            response.clearCookie("refreshToken");
            return response.status(403).send({ erro: 'Refresh inválido' });
        }
    });

    app.post('/auth/logout', (req, res) => {
        res.clearCookie('refreshToken');
        return res.sendStatus(204);
    });
}