import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as Supporter from "../models/supporter.model";
import * as Petition from "../models/petition.model";
import * as Tier from "../models/supportTier.model";
import {validate} from "../utils/validators";
import * as schemas from "../resources/schemas.json";

const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Bad Request: petitionId must be a number";
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOneBasic(petitionId);
        if (petition === null) {
            res.status(404).send("Not found. No petition with id");
            return;
        }
        const supporters = await Supporter.getSupporters(petitionId);
        if (supporters) {
            res.status(200).send(supporters);
            return;
        }
        else {
            res.statusMessage = "Could not get supporters from database";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}
// what is the login situation here?
// why does (!petition) work but not (petition === null) on line 48
const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Bad Request: petitionId must be a number";
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOneBasic(petitionId);
        if (!petition) {
            res.status(404).send("Not found. No petition with id");
            return;
        }
        if (req.authId === petition.ownerId) {
            res.statusMessage = "Cannot support own petition";
            res.status(403).send();
            return;
        }
        const supportTierId = parseInt(req.body.supportTierId, 10);
        if (isNaN(supportTierId)) {
            res.statusMessage = "Bad Request: supportTierId must be a number";
            res.status(400).send();
            return;
        }
        if (await Tier.getTier(supportTierId) === null) {
            res.statusMessage = "Support tier not found";
            res.status(400).send();
            return;
        }
        if (await Supporter.checkSupporter(req.authId, supportTierId)) {
            res.statusMessage = "Already supporting at this tier";
            res.status(403).send();
            return;
        }
        const validation = await validate(schemas.support_post, req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        // may need to return supporter id (insertid)
        const result = await Supporter.addSupporter(supportTierId, req.body.message, req.authId, petitionId);
        if (result) {
            res.status(201).send("Created");
            return;
        } else {
            res.statusMessage = "Supporter could not be added to database";
            res.status(500).send();
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllSupportersForPetition, addSupporter}