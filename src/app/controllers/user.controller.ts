import {Request, Response} from "express";
import Logger from '../../config/logger';
import {validate} from '../utils/validators';
import * as User from "../models/user.model";
import * as passwords from '../utils/passwords'
import * as schemas from '../resources/schemas.json';
import {uid} from 'rand-token';

const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const validationResult = await validate(
            schemas.user_register,
            req.body);

        if (validationResult !== true) {
            res.statusMessage = `Bad Request: ${validationResult.toString()}`;
            res.status(400).send();
            return;
        }
        req.body.password = await passwords.hash(req.body.password)
        const registrationResult = await User.register(req.body);
        res.status( 201 ).send({"userId": registrationResult.insertId});
        return;
    } catch (err) {
        Logger.error(err)
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Email already in use";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const validationResult = await validate(
            schemas.user_login,
            req.body);

        if (validationResult !== true) {
            res.statusMessage = `Bad Request: ${validationResult.toString()}`;
            res.status(400).send();
            return;
        }
        const foundUser = await User.findUserByEmail(req.body.email);
        if(foundUser === null || !await passwords.compare(req.body.password, foundUser.password)) {
            res.statusMessage = 'Invalid email/password';
            res.status(401).send();
            return;
        }
        const authToken = uid(64)
        await User.login(foundUser.id, authToken)
        res.status( 200 ).send({"userId": foundUser.id, "token": authToken});
        return;
    } catch (err) {
        Logger.error(err)
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        // authId comes from the request automatically?//
        const userId = req.authId;
        await User.logout(userId)
        res.status(200).send()
        return;
    } catch (err) {
        Logger.error(err)
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}
// need to be logged in to view anyone's information, but can only view all information of own profile, hence relaxed authentication only required//
const view = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const foundUser = await User.view(userId)
        if(foundUser === null) {
            res.status(404).send("User not found");
            return;
        }
        if(req.authId === userId) {
            res.status(200).send(foundUser)
            return;
        }
        delete foundUser.email
        res.status(200).send(foundUser as userReturn)
        return;
    } catch (err) {
        Logger.error(err)
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const foundUser = await User.findUserById(userId)
        if(foundUser === null){
            res.status(404).send("User not found");
            return;
        }
        if(req.authId !== parseInt(req.params.id, 10)){
            res.status(403).send("Forbidden: cannot edit another users information");
            return;
        }

        const validationResult = await validate(
            schemas.user_edit,
            req.body);

        if (validationResult !== true) {
            res.statusMessage = `Bad Request: ${validationResult.toString()}`;
            res.status(400).send();
            return;
        }

        if(req.body.hasOwnProperty("password")) {
            if(req.body.hasOwnProperty("currentPassword")) {
                if(!await passwords.compare(req.body.currentPassword, foundUser.password)) {
                    res.statusMessage = "Incorrect currentPassword";
                    res.status(401).send();
                    return;
                } else {
                    if(await passwords.compare(req.body.password, foundUser.password)){
                        res.statusMessage = "New password can not be the same as old password";
                        res.status(403).send();
                        return;
                    }
                    foundUser.password = await passwords.hash(req.body.password);
                }
            } else {
                res.statusMessage = "currentPassword must be supplied to change password";
                res.status(400).send();
                return;
            }
        }
        if(req.body.hasOwnProperty("email")) {
            foundUser.email = req.body.email;
        }
        if(req.body.hasOwnProperty("firstName")) {
            foundUser.firstName = req.body.firstName;
        }
        if(req.body.hasOwnProperty("lastName")) {
            foundUser.lastName = req.body.lastName;
        }
        await User.update(foundUser);
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err)
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Email already in use";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

export {register, login, logout, view, update}