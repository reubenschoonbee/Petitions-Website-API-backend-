import {getPool} from "../../config/db";
import {ResultSetHeader} from "mysql2";
import Logger from '../../config/logger';

const getSupporters = async (petitionId: number): Promise<supporter[]> => {
    const query = "SELECT S.id as supportId, S.support_tier_id as supportTierId, S.message, S.user_id as supporterId, U.first_name as supporterFirstName, U.last_name as supporterLastName, S.timestamp FROM supporter S join user U ON U.id = S.user_id WHERE petition_id = ? ORDER BY timestamp DESC, petition_id ASC";
    const [result] = await getPool().query(query, petitionId);
    return result as supporter[];
}
const addSupporter = async (supportTierId: number, message: string, supporterId: number, petitionId: number): Promise<ResultSetHeader> => {
    Logger.info(`Variables in addSupporter: supportTierId=${supportTierId}, message=${message}, supporterId=${supporterId}, petitionId=${petitionId}`);
    const query = "INSERT INTO supporter (petition_id, support_tier_id, user_id, message, timestamp) VALUES (?, ?, ?, ?, ?)";
    const [result] = await getPool().query(query, [petitionId, supportTierId, supporterId, message, new Date()]);
    return result;
}

const checkSupporter = async (supportTierId: number, supporterId: number): Promise<boolean> => {
    const query = "SELECT * FROM supporter WHERE support_tier_id = ? AND user_id = ? ";
    const [result] = await getPool().query(query, [supportTierId, supporterId]);
    return result.length > 0;
}

export {getSupporters, addSupporter, checkSupporter}