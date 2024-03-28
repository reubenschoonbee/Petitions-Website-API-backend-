import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as Tier from "../models/supportTier.model";
import {validate} from "../utils/validators";
import * as schemas from "../resources/schemas.json";
import * as Petition from "../models/petition.model";

// need to make sure I have catered for 500 errors where the SQL statement may not have gone through - like in edit petition
// seems integer passing should come before authentication
// just need to to get and delete
const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.support_tier_post, req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Bad Request: petitionId must be a number";
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOneBasic(petitionId);
        if (petition == null) {
            res.status(404).send();
            return;
        }
        if (petition.ownerId !== req.authId) {
            res.statusMessage = "Cannot edit another users petition";
            res.status(403).send();
            return;
        }
        const count = await Tier.getNumberOfTiers(petitionId);
        if (count >= 3){
            res.statusMessage = "Bad Request: petition already has 3 tiers";
            res.status(403).send();
            return;
        }
        const result = await Tier.addNewTier(req.body.title, req.body.description, req.body.cost, petitionId);
        res.status(201).send({supportTierId: result});
    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Support title not unique within petition";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Bad Request: petitionId must be a number";
            res.status(400).send();
            return;
        }
        // this function just happened to have the same info needed (nothing to do with deleting)
        const petition = await Petition.getDeleteInfo(petitionId);
        if (petition === null) {
            res.status(404).send("Petition does not exist");
            return;
        }
        if (req.authId !== petition.ownerId) {
            res.statusMessage = "Cannot edit another users petition";
            res.status(403).send();
            return;
        }
        if (petition.numberOfSupporters > 0) {
            res.statusMessage = "Can not edit a support tier if a supporter already exists for it"
            res.status(403).send();
            return;
        }
        const tierId = parseInt(req.params.tierId, 10);
        if (isNaN(tierId)) {
            res.statusMessage = "Bad Request: supportTierId must be a number";
            res.status(400).send();
            return;
        }
        const validation = await validate(schemas.support_tier_patch, req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        const tier = await Tier.getTier(tierId);
        if (tier === null) {
            res.status(404).send();
            return;
        }
        let title;
        if (req.body.hasOwnProperty("title")) {
            title = req.body.title;
        } else {
            title = tier.title;
        }
        let description;
        if (req.body.hasOwnProperty("description")) {
            description = req.body.description;
        } else {
            description = tier.description;
        }
        let cost;
        if (req.body.hasOwnProperty("cost")) {
            cost = req.body.cost;
        } else {
            cost = tier.cost;
        }
        const result = await Tier.editTier(petitionId, tierId, title, description, cost);
        Logger.info(result);
        if (result) {
            res.status(200).send("OK");
            return;
        } else {
            res.statusMessage = "Support tier could not be updated in the database";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Support title not unique within petition";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

// just need to do 2nd delete test
const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Bad Request: petitionId must be a number";
            res.status(400).send();
            return;
        }
        const petition = await Petition.getDeleteInfo(petitionId);
        if (petition === null) {
            res.status(404).send("Petition does not exist");
            return;
        }
        if (req.authId !== petition.ownerId) {
            res.statusMessage = "Cannot delete another users petition";
            res.status(403).send();
            return;
        }
        const numTiers = await Tier.getNumberOfTiers(petitionId);
        if (numTiers === 1){
            res.statusMessage = "Cannot delete the last support tier";
            res.status(403).send();
        }
        const tierId = parseInt(req.params.tierId, 10);
        if (isNaN(tierId)) {
            res.statusMessage = "Bad Request: supportTierId must be a number";
            res.status(400).send();
            return;
        }
        const tier = await Tier.getTier(tierId);
        Logger.info(tier);
        if (!tier) {
            res.status(404).send("Tier does not exist");
            return;
        }
        const numSupporters = await Tier.getNumberOfTierSupporters(petitionId, tierId);
        if (numSupporters > 0) {
            res.statusMessage = "Can not delete a support tier if a supporter already exists for it"
            res.status(403).send();
            return;
        }
        const result = await Tier.deleteTier(petitionId, tierId);
        if (result) {
            res.status(200).send("OK");
            return;
        } else {
            res.statusMessage = "Support tier could not be deleted in the database";
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

export {addSupportTier, editSupportTier, deleteSupportTier}