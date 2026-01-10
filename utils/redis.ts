require('dotenv').config();
import {Redis} from 'ioredis';


const redisClinet= ()=>{
    if(process.env.REDIS_URL){
        return process.env.REDIS_URL;
    }
    throw new Error("Redis connection failed")
}

export const redis= new Redis(redisClinet());