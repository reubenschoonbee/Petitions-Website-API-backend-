import {Request, Response} from "express";
import Logger from '../../config/logger';
import {validate} from "../utils/validators";
import * as schemas from '../resources/schemas.json';
import * as Petition from  '../models/petition.model';

const getAllPetitions = async (req: Request, res: Response): Promise<petitionAll[]> => {
    try{
        const validation = await validate(schemas.petition_search, req.query)
        if (validation !== true ) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        if (req.query.hasOwnProperty("startIndex"))
            req.query.startIndex = parseInt(req.query.startIndex as string, 10) as any;
        if (req.query.hasOwnProperty("count"))
            req.query.count = parseInt(req.query.count as string, 10) as any;
        if (req.query.hasOwnProperty("ownerId"))
            req.query.ownerId = parseInt(req.query.ownerId as string, 10) as any;
        if (req.query.hasOwnProperty("supporterId"))
            req.query.supporterId = parseInt(req.query.supporterId as string, 10) as any;
        if (req.query.hasOwnProperty("supportingCost"))
            req.query.supportingCost = parseInt(req.query.supportingCost as string, 10) as any;
        if (req.query.hasOwnProperty("categoryIds")) {
            if (!Array.isArray(req.query.categoryIds))
                req.query.categoryIds = [parseInt(req.query.categoryIds as string, 10)] as any;
            else
                req.query.categoryIds = (req.query.categoryIds as string[]).map((x: string) => parseInt(x, 10)) as any;
            const categories = await Petition.getCategories();
            if (!(req.query.categoryIds as any as number[]).every(c => categories.map(x => x.categoryId).includes(c))) {
                res.statusMessage = `Bad Request: No category with id`;
                res.status(400).send();
                return;
            }
        }
        let search: petitionQuery = {
            q: '',
            startIndex: 0,
            count: -1,
            categoryIds: [],
            supportingCost: -1,
            supporterId: -1,
            ownerId: -1,
            sortBy: 'CREATED_ASC'
        }
        search = {...search, ...req.query} as petitionQuery;
        const petitions = await Petition.viewAllPetitions(search);
        res.status(200).send(petitions);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const getPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOne(petitionId);
        if (petition !== null) {
            res.status(200).send(petition);
            return;
        } else {
            res.status(404).send("Not found. No petition with id");
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.petition_post, req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        let creationDate = null;
        const d = new Date()
        const year = d.getFullYear()
        const month = d.getMonth()
        const day = d.getDate()
        const hour = d.getHours()
        const minute = d.getMinutes()
        const second = d.getSeconds()
        creationDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`

        const categories = await Petition.getCategories();
        if (!categories.find(c => c.categoryId === req.body.categoryId)) {
            res.statusMessage = "No category with id"
            res.status(400).send();
            return;
        }
        // need to add error handling for adding support tiers
        const result = await Petition.addOne(req.authId, req.body.title, req.body.description, req.body.categoryId, creationDate)
        if (result) {
            req.body.supportTiers.forEach((tier: supportTierFull) => Petition.addTier(tier, result.insertId));
            res.status(201).send({"petitionId": result.insertId});
            return;
        }
        else {
            res.status(500).send("Petition could not be added to the database")
            return;
        }

    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Duplicate petition";
            res.status(403).send();
            return;
        } else if (err.errno === 1292 && err.message.includes("datetime")) {
            res.statusMessage = "Bad Request: Invalid datetime value";
            res.status(400).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}
// neeed to think about which order errors need to happen in - does authentication come first?
const editPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(schemas.petition_patch,req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Id must be an integer"
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
        let title;
        if (req.body.hasOwnProperty("title")) {
            title = req.body.title;
        } else {
            title = petition.title;
        }
        let description;
        if (req.body.hasOwnProperty("description")) {
            description = req.body.description;
        } else {
            description = petition.description;
        }
        let categoryId;
        if (req.body.hasOwnProperty("categoryId")){
            categoryId = req.body.categoryId;
        } else {
            categoryId = petition.categoryId;
        }

        const result = await Petition.editPetition(petitionId, title, description, categoryId)
        if (result) {
            res.status(200).send();
            return;
        } else {
            Logger.warn("Petition not updated in database...");
            res.statusMessage = "Petition could not be updated";
            res.status(500).send();
        }

    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Petition title already exists";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const petition = await Petition.getDeleteInfo(petitionId);
        if (petition === null) {
            res.status(404).send("Not found. No petition with id");
            return;
        }
        if (petition.numberOfSupporters > 0){
            res.statusMessage = "Can not delete a petition with one or more supporters";
            res.status(403).send();
            return;
        }
        Logger.info(petition)
        Logger.info(req.authId)
        Logger.info(`OwnerId of petition: ${petition.ownerId}`);
        if (petition.ownerId !== req.authId) {
            res.statusMessage = "Only the owner of a petition may delete it";
            res.status(403).send();
            return;
        }
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getCategories = async(req: Request, res: Response): Promise<void> => {
    try{
        const categories = await Petition.getCategories();
        res.status(200).send(categories);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {addPetition, deletePetition, getCategories, editPetition, getPetition, getAllPetitions};