import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});

// this is from Morgans code//
ajv.addFormat('email',/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)
ajv.addFormat('password', /^.{6,}$/);
ajv.addFormat('binary', /.*/);
ajv.addFormat('integer', /^\d+$/)
// ajv.addFormat('datetime', /^\d\d\d\d-\d\d?-\d\d? \d\d?:\d\d?:\d\d?$/)

// this is from morgans code//
const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = await validator(data);
        if(!valid)
            return ajv.errorsText(validator.errors);
        return true;
    } catch (err) {
        return err.message;
    }
}

export {validate}



// function validateEmail(email: string): boolean {
//     if (email.length < 1 || email.length > 256){
//         return false;
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
// }
//
// function validateName(name: string): boolean {
//     return (name.length >=1 && name.length <= 64)
// }
//
// function validatePassword(name: string): boolean {
//     return (name.length >=6 && name.length <= 64)
// }
// // calls functions to validate info for register - need to figure out what kind of input can be passed, can there be nulls or non-strings passed?//
// // do we need to check for if the variable passed is a string?//
// function validateRegister(u: userRegister): boolean{
//     if (!validateEmail(u.email) || !validateName(u.firstName) || !validateName(u.lastName) || !validatePassword(u.password)){
//         return false;
//     }
//     return true;
// }
//
// export {validateRegister}