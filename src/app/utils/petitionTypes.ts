type petition = {
    petitionId: number,
    ownerId: number,
    categoryId: number,
    creationDate: string,
    title: string,
    description: string,
}
type petitionAll = {
    petitionId: number,
    title: string,
    categoryId: number,
    ownerId: number,
    ownerFirstName: string,
    ownerLastName: string,
    numberOfSupporters: number,
    creationDate: string,
    supportingCost: number,
}
type petitionQuery = {
    startIndex?: number,
    count?: number,
    q?: string,
    categoryIds?: number[],
    supportingCost?: number,
    ownerId?: number,
    supporterId?: number,
    sortBy?: string
}

type petitionReturn = {
    petitions: petition[],
    count: number
}

type petitionDelete ={
    ownerId: number,
    numberOfSupporters: number
}
// supportTier type includes petitionId which isn't needed for full info
type petitionFull = {
    ownerFirstName: string,
    ownerLastName: string,
    numberOfSupporters: number,
    moneyRaised: number,
    supportTiers: any;
} & petition
type petitionBasic = {
    title: string
    description: string,
    categoryId: number,
    ownerId: number
}
type category = {
    categoryId: number,
    name: string
}
type supportTierBasic = {
    description: string,
    title: string,
    cost: number,
    supportTierId: number
}
type supportTierFull ={
    supportTierId: number,
    petitionId: number,
    title: string,
    description: string,
    cost: number
}
type supporter = {
    supportId: number,
    supportTierId: number,
    message: string,
    supporterId: number,
    supporterFirstName: string,
    supporterLastName: string,
    timestamp: string
}