import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as Tool from "../models/imageTools";
import * as Image from "../models/image.model";
import * as Petition from "../models/petition.model";
import * as Users from "../models/user.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10 );
        if(isNaN(petitionId)){
            res.statusMessage = "Id must be an integer";
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOne(petitionId);
        if(!petition){
            res.status(404).send("No petition with id");
            return;
        }
        const filename = await Petition.getImageFilename(petitionId);
        if (!filename){
            res.status(404).send("No image for this petition");
            return;
        }
        const [image, mimetype]  = await Image.readImage(filename)
        res.status(200).contentType(mimetype).send(image)
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        let isNew = true;
        const petitionId = parseInt(req.params.id, 10);
        if (isNaN(petitionId)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const petition = await Petition.getOneBasic(petitionId);
        if(petition == null) {
            res.status(404).send("No petition with id");
            return;
        }
        Logger.info(req.authId);
        Logger.info(petition.ownerId);
        if(req.authId !== petition.ownerId) {
            res.statusMessage = "Forbidden: Only the owner of the petition can change the hero image";
            res.status(403).send();
            return;
        }
        const image = req.body;
        const mimeType = req.header('Content-Type');
        const fileExt = Tool.getImageExtension(mimeType);

        if (fileExt === null) {
            res.statusMessage = "Invalid file type";
            res.status(400).send();
            return;
        }
        if (image.length === undefined) {
            res.statusMessage = 'Bad request: empty image';
            res.status(400).send();
            return;
        }
        const oldFilename = await Petition.getImageFilename(petitionId);
        if (oldFilename) {
            await Image.removeImage(oldFilename);
            isNew = false;
        }
        const newFilename = await Image.addImage(image, fileExt);
        await Petition.setImageFileName(petitionId, newFilename);
        if(isNew)
            res.status(201).send("Created. Image added")
        else
            res.status(200).send("OK. Image updated")
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {getImage, setImage};