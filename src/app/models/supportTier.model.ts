import {getPool} from "../../config/db";
import {ResultSetHeader} from "mysql2";
import Logger from '../../config/logger';

const addNewTier = async (title: string, description: string, cost: number, petitionId: number): Promise<number> => {
    const query = "INSERT INTO support_tier (title, description, cost, petition_id) VALUES (?, ?, ?, ?)";
    const [result] = await getPool().query(query, [title, description, cost, petitionId]);
    return result.insertId;
}
const getNumberOfTiers = async (petitionId: number): Promise<number> => {
    const query = "SELECT COUNT(*) as count FROM support_tier WHERE petition_id = ?";
    const [result] = await getPool().query(query, petitionId);
    return result[0].count;
}

const getTier = async (tierId: number): Promise<supportTierFull> => {
    const query = "SELECT * FROM support_tier WHERE id = ?";
    const [result] = await getPool().query(query, [tierId]);
    return result[0] as supportTierFull;
}

const editTier = async (petitionId: number, tierId: number, title: string, description: string, cost: number): Promise<boolean> => {
    const query = "UPDATE support_tier SET title = ?, description = ?, cost = ? WHERE petition_id = ? AND id = ?";
    const [result] = await getPool().query(query, [title, description, cost, petitionId, tierId]);
    return result && result.affectedRows === 1;
}

const deleteTier = async (petitionId: number, tierId: number): Promise<boolean> => {
    const query = "DELETE FROM support_tier WHERE petition_id = ? AND id = ?";
    const [result] = await getPool().query(query, [petitionId, tierId]);
    return result && result.affectedRows === 1;
}

const getNumberOfTierSupporters = async (petitionId: number, tierId: number): Promise<number> => {
    const query = "SELECT COUNT(*) as count FROM supporter WHERE petition_id = ? AND support_tier_id = ?";
    const [result] = await getPool().query(query, [petitionId, tierId]);
    return result[0].count;
}
export {addNewTier, getNumberOfTiers, getTier, editTier, deleteTier, getNumberOfTierSupporters}