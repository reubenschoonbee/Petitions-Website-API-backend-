import {findUserByToken} from "../models/user.model";
import {NextFunction, Request, Response} from "express";
import Logger from "../../config/logger";

const authenticate = async (req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const authToken = req.header('X-Authorization');
        const authenticatedUser = await findUserByToken(authToken);
        if(authenticatedUser === null) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        req.authId = authenticatedUser.id;
        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
        return;
    }
}

const relaxedAuthenticate = async (req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const authToken = req.header('X-Authorization');
        const authenticatedUser = await findUserByToken(authToken);
        if(authenticatedUser !== null) {
            req.authId = authenticatedUser.id;
            next();
        } else {
            req.authId = -1;
            next();
        }
    } catch (err) {
        req.authId = -1;
        next();
    }
}

export {authenticate, relaxedAuthenticate}