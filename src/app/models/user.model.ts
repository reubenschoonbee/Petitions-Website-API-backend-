import {getPool} from "../../config/db";
import {ResultSetHeader} from "mysql2";
import {camelizeKeys} from 'humps';

const register = async(userDetails:userRegister): Promise<ResultSetHeader> => {
    const query = "INSERT INTO user (first_name, last_name, email, password) VALUES (?)"
    const [result] = await getPool().query(query,[[userDetails.firstName, userDetails.lastName, userDetails.email, userDetails.password]]);
    return result
}

const findUserByEmail = async(email: string): Promise<user> => {
    const query = 'SELECT * FROM `user` WHERE `email` = ?';
    const rows = await getPool().query(query, [email]);
    return rows[0].length === 0 ? null : camelizeKeys(rows[0][0]) as unknown as user
}

const findUserByToken = async(token: string): Promise<user> => {
    const query = 'SELECT * FROM `user` WHERE `auth_token` = ?';
    const rows = await getPool().query(query, [token]);
    return rows[0].length === 0 ? null : camelizeKeys(rows[0][0]) as unknown as user
}

const findUserById = async(userId: number): Promise<user> => {
    const query = 'SELECT * FROM `user` WHERE `id` = ?';
    const rows = await getPool().query(query, [userId]);
    return rows[0].length === 0 ? null : camelizeKeys(rows[0][0]) as unknown as user
}

const login = async(userId: number, token: string): Promise<ResultSetHeader> => {
    const query = "UPDATE user SET auth_token = ? WHERE id = ?"
    const [result] = await getPool().query(query,[token, userId]);
    return result
}

const logout = async (userId: number): Promise<ResultSetHeader> => {
    const query = "UPDATE user SET auth_token = ? WHERE id = ?"
    const [result] = await getPool().query(query,[null, userId]);
    return result
}

const view = async (userId: number): Promise<userReturnWithEmail> => {
    const query = "SELECT `first_name`, `last_name`, `email` FROM `user` WHERE `id` = ?"
    const [rows] = await getPool().query(query,[userId]);
    return rows.length === 0 ? null : camelizeKeys(rows[0]) as unknown as userReturnWithEmail
}

const update = async (userDetails: user): Promise<ResultSetHeader> => {
    const query = "UPDATE user SET first_name = ?, last_name = ?, email =?, password=? WHERE id = ?"
    const [result] = await getPool().query(query,[userDetails.firstName, userDetails.lastName, userDetails.email, userDetails.password, userDetails.id]);
    return result
}

const getImageFilename = async (userId:number): Promise<string> => {
    const query = 'SELECT `image_filename` FROM `user` WHERE id = ?'
    const rows = await getPool().query(query, [userId])
    return rows[0].length === 0 ? null: rows[0][0].image_filename;
}

const setImageFileName = async (userId: number, imageFilename: string): Promise<void> => {
    const query = `UPDATE \`user\` SET image_filename = ? WHERE id = ?`;
    const result = await getPool().query(query, [imageFilename, userId]);
}

const removeImageFilename = async (userId: number): Promise<void> => {
    const query = `UPDATE \`user\` SET image_filename = NULL WHERE id = ?`;
    const result = await getPool().query(query, [userId]);
}


export {register, findUserByEmail, login, logout, view, findUserById, update, findUserByToken, setImageFileName, getImageFilename, removeImageFilename}