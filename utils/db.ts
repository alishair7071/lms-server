require('dotenv').config();
import mongoose from 'mongoose';

const dbUrl: string= process.env.DB_URL || '';

const connectDB= async ()=>{
    try {
        mongoose.connect(dbUrl).then((data:any)=>{
            console.log(`MongoDB connected with server: ${data.connection.host}`);
        });
    } catch (error: any) {
        console.log(`MongoDB connection error: ${error}`);
        setTimeout(connectDB, 5000);      
    }
}

export default connectDB;
