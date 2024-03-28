import {Request, Response} from "express";
import * as Users from "../models/user.model";
import * as Image from "../models/image.model";
import Logger from "../../config/logger";
import * as Tool from "../models/imageTools";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userIdentifier = parseInt(req.params.id, 10);
        if (isNaN(userIdentifier)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const foundUser = await Users.findUserById(userIdentifier);
        if (foundUser == null) {
            res.status(404).send("No user with id");
            return;
        }
        const imageFilename = await Users.getImageFilename(userIdentifier)
        if(imageFilename == null) {
            res.status(404).send("No image for this user");
            return;
        }
        const [userImage, imageMimeType]  = await Image.readImage(imageFilename)
        res.status(200).contentType(imageMimeType).send(userImage)
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        let isNewImage = true;
        const userIdentifier = parseInt(req.params.id, 10);
        if (isNaN(userIdentifier)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const userImage = req.body;
        const foundUser = await Users.findUserById(userIdentifier);
        if(req.authId !== userIdentifier) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }
        if(foundUser == null) {
            res.status(404).send();
            return;
        }
        const imageMimeType = req.header('Content-Type');
        const imageFileExtension = Tool.getImageExtension(imageMimeType);
        if (imageFileExtension === null) {
            res.statusMessage = 'Bad Request: photo must be image/jpeg, image/png, image/gif type, but it was: ' + imageMimeType;
            res.status(400).send();
            return;
        }

        if (userImage.length === undefined) {
            res.statusMessage = 'Bad request: empty image';
            res.status(400).send();
            return;
        }

        const imageFilename = await Users.getImageFilename(userIdentifier);
        if(imageFilename != null && imageFilename !== "") {
            await Image.removeImage(imageFilename);
            isNewImage = false;
        }
        const newImageFilename = await Image.addImage(userImage, imageFileExtension);
        await Users.setImageFileName(userIdentifier, newImageFilename);
        if(isNewImage)
            res.status(201).send()
        else
            res.status(200).send()
    } catch (err) {
        Logger.error(err)
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userIdentifier = parseInt(req.params.id, 10);
        if (isNaN(userIdentifier)) {
            res.statusMessage = "Id must be an integer"
            res.status(400).send();
            return;
        }
        const foundUser = await Users.findUserById(userIdentifier);
        if (req.authId !== userIdentifier) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }
        if (foundUser == null) {
            res.status(404).send();
            return;
        }
        const imageFilename = await Users.getImageFilename(userIdentifier);
        if (imageFilename == null || imageFilename === "") {
            res.status(404).send();
            return;
        }
        await Image.removeImage(imageFilename);
        await Users.removeImageFilename(userIdentifier)
        res.status(200).send();
    } catch (err) {
        Logger.error(err);
        res.status(500).send();
    }
}

export {getImage, setImage, deleteImage}