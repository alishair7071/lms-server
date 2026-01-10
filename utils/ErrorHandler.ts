class ErrorHandler extends Error {

    statusCode: Number;
    constructor(message:any, statusCode: Number){
        super(message);
        this.statusCode= statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ErrorHandler;


/*
const ErrorHandler= (statusCode: Number, message: any) : Error =>{
    let error= new Error() as any;
    error.statusCode= statusCode;
    error.message= message;
    return error;
}

export default ErrorHandler;
*/