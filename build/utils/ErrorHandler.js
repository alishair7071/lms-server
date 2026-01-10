"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = ErrorHandler;
/*
const ErrorHandler= (statusCode: Number, message: any) : Error =>{
    let error= new Error() as any;
    error.statusCode= statusCode;
    error.message= message;
    return error;
}

export default ErrorHandler;
*/ 
