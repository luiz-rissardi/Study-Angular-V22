import { Application } from "express";
import { AuthenticatedRequest, authenticateHook, db, UserModel } from "./server";
import jwt from "jsonwebtoken";

export function createRoutes(app: Application) {
    app.post("/auth/login", (request, response) => {
        try {
            const { userName, password } = request.body as UserModel;
            let user: UserModel = {
                userName: "",
                email: "",
                age: null,
                userType: "",
                id: "",
                password: ""
            };

            db.forEach((el: UserModel) => {
                if (el.userName == userName && password == el.password) {
                    user = el;
                }
            })

            if (user.id === "") {
                response.status(401).send("Invalid Credentials!");
                return;
            }

            const accessToken = jwt.sign({ userId: user.id }, process.env["JWT_SECRET"]!, { expiresIn: '20s' });
            const refreshToken = jwt.sign({ userId: user.id }, process.env["REFRESH_SECRET"]!, { expiresIn: '7d' });

            response.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                signed: true,
                sameSite: 'strict',  // mitiga CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            response.send({
                accessToken,
                userId: user.id
            })

        } catch (error) {
            console.log(error);
            response.status(500).send("Internal server error");
        } finally {
            response.end();
        }
    })

    app.put("/user", authenticateHook, (request: AuthenticatedRequest, response) => {
        try {
            const newUserData: UserModel = request.body;
            const userId = request.userId;

            if (newUserData.userName !== "") {
                db.delete(userId);
                db.set(userId, { ...newUserData });
            }

            response.status(200).send({ ...newUserData });
        } catch (error) {
            response.status(500).send("Internal server error");
        } finally {
            response.end();
        }
    })

    app.post("/auth/refresh", (request, response) => {
        const refreshToken = request.signedCookies.refreshToken;
        if (!refreshToken) {
            response.status(500).json({ erro: 'Sem refresh token' });
            return;
        }

        try {
            // fazer a rotação de refreshToken
            const payload = jwt.verify(refreshToken, process.env["REFRESH_SECRET"]!) as { userId: string };
            const newAccessToken = jwt.sign({ userId: payload.userId }, process.env["JWT_SECRET"]!, { expiresIn: '15m' });
            const newRefreshToken = jwt.sign({ userId: payload.userId }, process.env["REFRESH_SECRET"]!, { expiresIn: '7d' });

            response.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                signed: true,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                // secure: true // lembre-se de ativar em produção!
            });
            response.send({accessToken:newAccessToken});
        } catch (error) {
            response.clearCookie("refreshToken");
            response.status(500).send({ erro: 'Refresh inválido' })
        } finally {
            response.end();
        }
    })

    app.post('/auth/logout', (req, res) => {
        res.clearCookie('refreshToken');
        res.sendStatus(204);
    });
}



