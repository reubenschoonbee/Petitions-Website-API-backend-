import {fs} from "mz";
import * as Tool from "./imageTools";
import {generate} from "rand-token";
import Logger from "../../config/logger";

const filepath = './storage/images/';

const readImage = async (imageFilename: string) : Promise<[Buffer, string]> => {
    const imageData = await fs.readFile(filepath + imageFilename);
    const mimeType = Tool.getImageMimetype(imageFilename);
    return [imageData, mimeType];
}

const removeImage = async (imageFilename: string): Promise<void> => {
    if(imageFilename) {
        if (await fs.exists(filepath + imageFilename)) {
            await fs.unlink(filepath + imageFilename);
        }
    }
}

// the file is added to the local file storage - unsure when it gets added to IDE view
const addImage = async (imageData:any, imageFileExtension: string): Promise<string> => {
    const imageFilename = generate(32) + imageFileExtension;
    try {
        await fs.writeFile(filepath + imageFilename, imageData);
        return imageFilename;
    } catch (err) {
        Logger.error(err);
        fs.unlink(filepath + imageFilename).catch(err => Logger.error(err));
        throw err;
    }
}

export {readImage, removeImage, addImage};