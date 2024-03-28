import {getPool} from "../../config/db";
import {ResultSetHeader} from "mysql2";
import Logger from '../../config/logger';

const viewAllPetitions = async(searchQuery: petitionQuery): Promise<{ count: number; petitions: petitionAll[] }> => {
    let query = `SELECT id FROM petition`;
    const queryParams = [];
    let whereAdded = false;

    if (searchQuery.q.length > 0 ) {
        query += ` WHERE (title LIKE ? OR description LIKE ?)`;
        queryParams.push(`%${searchQuery.q}%`, `%${searchQuery.q}%`);
        whereAdded = true;
    }

    if (searchQuery.categoryIds.length > 0) {
        query += whereAdded ? ` AND category_id IN (?)` : ` WHERE category_id IN (?)`;
        queryParams.push(searchQuery.categoryIds);
        whereAdded = true;
    }

    if (searchQuery.supportingCost !== -1) {
        query += whereAdded ? ` AND id IN (SELECT petition_id FROM support_tier WHERE cost <= ?)` : ` WHERE id IN (SELECT petition_id FROM support_tier WHERE cost <= ?)`;
        queryParams.push(searchQuery.supportingCost);
        whereAdded = true;
    }

    if (searchQuery.ownerId !== -1) {
        query += whereAdded ? `AND owner_id = ?` : ` WHERE owner_id = ?`;
        queryParams.push(searchQuery.ownerId);
        whereAdded = true;
    }

    if (searchQuery.supporterId !== -1) {
        query += whereAdded ? ` AND id IN (SELECT petition_id FROM supporter WHERE user_id = ?)` : ` WHERE id IN (SELECT petition_id FROM supporter WHERE user_id = ?)`;
        queryParams.push(searchQuery.supporterId);
    }
    if (searchQuery.sortBy) {
        switch (searchQuery.sortBy) {
            case 'ALPHABETICAL_ASC':
                query += ` ORDER BY title ASC`;
                break;
            case 'ALPHABETICAL_DESC':
                query += ` ORDER BY title DESC`;
                break;
            case 'COST_ASC':
                query += ` ORDER BY (SELECT MIN(cost) FROM support_tier WHERE petition_id = petition.id) `;
                break;
            case 'COST_DESC':
                query += ` ORDER BY (SELECT MIN(cost) FROM support_tier WHERE petition_id = petition.id) DESC `;
                break;
            case 'CREATED_ASC':
                query += ` ORDER BY creation_date ASC`;
                break;
            case 'CREATED_DESC':
                query += ` ORDER BY creation_date DESC`;
                break;
        }
    }
    query += ` , id ASC`
    const countQuery = query;
    const countParams = queryParams;
    if (searchQuery.count !== -1) {
        query += ` LIMIT ?`;
        queryParams.push(searchQuery.count);
    }
    if (searchQuery.startIndex !== 0) {
        query += ` OFFSET ?`;
        queryParams.push(searchQuery.startIndex);
    }
    const rows = await getPool().query(query, queryParams);
    const petitionIds = rows[0] as { id: number }[];
    const countResult = await getPool().query(countQuery, countParams);
    const count = countResult[0].length
    const petitions: petitionAll[] = [];
    const petitionQuery = `SELECT P.id AS petitionId, P.title AS title, P.category_id AS categoryId, P.creation_date AS creationDate, P.owner_id AS ownerId, U.first_name AS ownerFirstName, U.last_name AS ownerLastName, (SELECT COUNT(DISTINCT S.user_id) FROM supporter S WHERE P.id = S.petition_id) AS numberOfSupporters, (SELECT COALESCE(MIN(ST.cost), 0) FROM support_tier ST WHERE ST.petition_id = P.id) AS supportingCost FROM petition P JOIN user U ON P.owner_id = U.id LEFT JOIN supporter S ON P.id = S.petition_id WHERE P.id = ?`;
    for (const { id } of petitionIds) {
        const petition = await getPool().query(petitionQuery, [id]);
        petitions.push(petition[0][0] as petitionAll);
    }
    return {"petitions": petitions,"count": count};
}


// combined the 4 individual queries
const getOne = async (petitionId: number):Promise<petitionFull> => {
    // const baseQuery= "SELECT P.id as petitionId, P.title as title, P.description as description,P.category_id as categoryId,P.creation_date as creation_date,P.owner_id as ownerId,U.first_name as ownerFirstName,U.last_name as ownerLastNameFROM petition P join user U on P.owner_id = U.idWHERE P.id = ?"
    // const countQuery = "SELECT COUNT(*) FROM petition P join supporter S on P.id = S.petition_id WHERE P.id = ?"
    // const supportQuery = "SELECT SUM(cost) as moneyRaised, title as title, description as description, cost as cost, id as supportTierId FROM support_tier WHERE petition_id = ?"
    // const moneyQuery = "SELECT SUM(cost) as moneyRaised FROM support_tier WHERE petition_id = ?"
    const query = `SELECT
    P.id AS petitionId,
    P.title AS title,
    P.description AS description,
    P.category_id AS categoryId,
    P.creation_date AS creationDate,
    U.first_name AS ownerFirstName,
    U.last_name AS ownerLastName,
    (SELECT COUNT(DISTINCT S.user_id) FROM supporter S WHERE P.id = S.petition_id) AS numberOfSupporters,
    (SELECT SUM(ST.cost) FROM (SELECT DISTINCT cost FROM support_tier WHERE petition_id = ?) AS ST) AS moneyRaised,
    CONCAT(
        '[',
        GROUP_CONCAT(
            DISTINCT CONCAT(
                '{"title": "', ST.title, '", ',
                '"description": "', ST.description, '", ',
                '"cost": ', ST.cost, ', ',
                '"supportTierId": ', ST.id,
                '}'
            )
            SEPARATOR ','
        ),
        ']'
    ) AS supportTiers
FROM
    petition P
JOIN
    user U ON P.owner_id = U.id
LEFT JOIN
    supporter S ON P.id = S.petition_id
LEFT JOIN
    support_tier ST ON P.id = ST.petition_id
WHERE
    P.id = ?
GROUP BY
    P.id`;
    const rows = await getPool().query(query, [petitionId, petitionId]);
    const petition = rows[0].length === 0 ? null : rows[0][0] as unknown as petitionFull;
    if (petition) {
        petition.supportTiers = JSON.parse(petition.supportTiers.replace(/\n/g, ' '));
        // petition.moneyRaised = parseFloat(String(petition.moneyRaised)); // Parse moneyRaised into a number
    }
    return petition;
}

// remember what the rows[0] is for
const getCategories = async (): Promise<category[]> => {
    const query = `SELECT id as categoryId, name FROM category`
    const rows = await getPool().query(query)
    return rows[0] as category[];
}

const addOne = async (ownerId: number, title: string, description: string, categoryId: number, creationDate: string): Promise<ResultSetHeader> => {
    const query = `INSERT INTO petition (owner_id, title, description, creation_date, category_id) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await getPool().query(query, [ownerId, title, description, creationDate, categoryId]);
    return result;

}

const addTier = async (t: supportTierFull, petitionId: number): Promise<ResultSetHeader> =>{
    const query = 'INSERT INTO support_tier (petition_id, title, description, cost) values (?,?,?,?)'
    const [result] = await getPool().query(query, [petitionId, t.title, t.description, t.cost]);
    return result;
}

const editPetition = async (petitionId: number, title: string, description: string, categoryId: number): Promise<boolean> => {
    const query = `UPDATE petition SET title=?, description=?, category_id=? WHERE id=?`;
    const [result] = await getPool().query(query, [title, description, categoryId, petitionId]);
    return result && result.affectedRows === 1;
}

const getOneBasic = async (petitionId: number): Promise<petitionBasic> => {
    const query = 'SELECT title, description, category_id as categoryId, owner_id as ownerId FROM petition WHERE id=?';
    const [result] = await getPool().query(query, petitionId);
    return result[0] as petitionBasic;
}

const getDeleteInfo = async (petitionId: number): Promise<petitionDelete> => {
    const query = `SELECT P.owner_id as ownerId, COUNT(distinct S.id) as numberOfSupporters FROM petition P join supporter S ON S.petition_id = P.id WHERE P.id = ?`;
    const [result] = await getPool().query(query, petitionId);
    return result[0] as petitionDelete;
}
const deleteOne = async (petitionId: number): Promise<boolean> => {
    const query = `DELETE FROM petition WHERE id = ?`;
    const [result] = await getPool().query(query, petitionId);
    return result && result.affectedRows === 1;
}
const getImageFilename = async (id:number): Promise<string> => {
    const query = 'SELECT `image_filename` FROM `petition` WHERE id = ?'
    const rows = await getPool().query(query, [id])
    return rows[0].length === 0 ? null: rows[0][0].image_filename;
}

const setImageFileName = async (id: number, filename: string): Promise<void> => {
    const query = `UPDATE \`petition\` SET image_filename = ? WHERE id = ?`;
    const result = await getPool().query(query, [filename, id]);
}

const removeImageFilename = async (id: number): Promise<void> => {
    const query = `UPDATE \`petition\` SET image_filename = NULL WHERE id = ?`;
    const result = await getPool().query(query, [id]);
}


export {viewAllPetitions, addOne, getCategories, addTier, editPetition, getOne, getOneBasic, getDeleteInfo, getImageFilename, setImageFileName, removeImageFilename, deleteOne}