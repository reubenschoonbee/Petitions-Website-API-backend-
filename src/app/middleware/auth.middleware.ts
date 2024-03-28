import {findUserByToken} from "../models/user.model";
import {NextFunction, Request, Response} from "express";
import Logger from "../../config/logger";

// stops flow if authentication token from header isn't the same as for intended user//
const authenticate = async (req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const token = req.header('X-Authorization');
        const user = await findUserByToken(token);
        if(user === null) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        req.authId = user.id;
        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
        return;
    }
}
// won't return an error if client not logged in to an existing user and will let flow continue - use for functions where client still has some functionality without being authenticated//
// returns -1 if not logged in//
const relaxedAuthenticate = async (req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const token = req.header('X-Authorization');
        const user = await findUserByToken(token);
        if(user !== null) {
            req.authId = user.id;
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