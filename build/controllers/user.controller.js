"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserRole = exports.getAllUsers = exports.updateUserProfilePicture = exports.updateUserPassword = exports.updateUserInfo = exports.socialAuth = exports.getUserInfo = exports.updateAccessToken = exports.logoutUser = exports.LoginUser = exports.activateUser = exports.registrationUser = void 0;
require("dotenv").config();
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../utils/redis");
const jwt_2 = require("../utils/jwt");
const jwt_3 = require("../utils/jwt");
const user_service_1 = require("../services/user.service");
const cloudinary_1 = __importDefault(require("cloudinary"));
exports.registrationUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const isEmailExist = await user_model_1.default.findOne({ email: email });
        if (isEmailExist) {
            return next(new ErrorHandler_1.default("Email already exist", 400));
        }
        const user = {
            name: name,
            email: email,
            password: password,
        };
        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };
        const html = await ejs_1.default.renderFile(__dirname + "/../mails/activation-mail.ejs", data);
        try {
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Account Activation",
                template: "activation-mail.ejs",
                data: { user: { name: user.name }, activationCode },
            });
            res.status(201).json({
                success: true,
                message: `Pleas check your email: ${user.email} to activate your account!`,
                activationToken: activationToken.token,
            });
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 500));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//create activation token
const createActivationToken = (user) => {
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jsonwebtoken_1.default.sign({ user, activationCode }, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });
    return { token, activationCode };
};
exports.activateUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { activation_token, activation_code } = req.body;
        const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.JWT_SECRET);
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler_1.default("Invalid activation code", 400));
        }
        const { name, email, password } = newUser.user;
        const existUser = await user_model_1.default.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler_1.default("Email already exists", 400));
        }
        const user = await user_model_1.default.create({
            name,
            email,
            password,
        });
        res.status(201).json({
            success: true,
            message: "User activated successfully",
        });
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.LoginUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { email, password } = req.body; //the as keyword is a TypeScript type assertion.
        if (!email || !password) {
            return next(new ErrorHandler_1.default("Please enter email and password", 400));
        }
        const user = await user_model_1.default.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("User not found with this email", 401));
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid email or password", 401));
        }
        (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 400));
    }
});
//logout user
exports.logoutUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        // Logout should be resilient: even if access/refresh token is missing/expired
        // we still clear cookies and return success so the UI can update immediately.
        console.log("logout requested");
        // Best-effort: delete session from redis if we can infer the user id from cookies
        let userId = "";
        const accessToken = req.cookies?.access_token;
        const refreshToken = req.cookies?.refresh_token;
        try {
            if (accessToken) {
                const decoded = jsonwebtoken_1.default.verify(accessToken, process.env.ACCESS_TOKEN);
                if (decoded?.id)
                    userId = String(decoded.id);
            }
        }
        catch {
            // ignore
        }
        try {
            if (!userId && refreshToken) {
                const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN);
                if (decoded?.id)
                    userId = String(decoded.id);
            }
        }
        catch {
            // ignore
        }
        if (userId) {
            await redis_1.redis.del(userId);
        }
        // Clear cookies using the same options they were set with (important for deletion)
        res.cookie("access_token", "", {
            ...jwt_2.accessTokenOptions,
            maxAge: 0,
            expires: new Date(0),
        });
        res.cookie("refresh_token", "", {
            ...jwt_3.refreshTokenOptions,
            maxAge: 0,
            expires: new Date(0),
        });
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 400));
    }
});
//update access token
exports.updateAccessToken = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const refresh_token = req.cookies?.refresh_token;
        // If there's no refresh token cookie, we can't refresh.
        // Treat as "no-op" middleware so routes can still authenticate via access token.
        if (!refresh_token) {
            return next();
        }
        let decode = null;
        try {
            decode = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN);
        }
        catch {
            // Invalid/expired refresh token; let downstream auth (access token) decide.
            return next();
        }
        if (!decode?.id) {
            return next(new ErrorHandler_1.default("Could not Refresh token", 400));
        }
        const session = await redis_1.redis.get(String(decode.id));
        if (!session) {
            return next(new ErrorHandler_1.default("Session expired, please login again!", 401));
        }
        const user = JSON.parse(session);
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN);
        const refresh_Token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN);
        req.user = user;
        // for route handlers that want the refreshed access token in the response
        res.locals.user = user;
        res.locals.accessToken = accessToken;
        res.cookie("access_token", accessToken, jwt_2.accessTokenOptions);
        res.cookie("refresh_token", refresh_Token, jwt_3.refreshTokenOptions);
        await redis_1.redis.set(String(user._id), JSON.stringify(user), "EX", 604800);
        next();
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//get user Info
exports.getUserInfo = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const userId = req.user?._id ? String(req.user._id) : "";
        // TESTING MODE: if there's no authenticated user, don't throw — return a guest payload.
        if (!userId) {
            return res.status(200).json({
                success: true,
                accessToken: "",
                user: {
                    _id: "",
                    name: "Guest",
                    email: "",
                    role: "guest",
                    courses: [],
                },
            });
        }
        (0, user_service_1.getUserById)(userId, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.socialAuth = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { email, name, avatar } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            const newUser = await user_model_1.default.create({ email, name, avatar });
            (0, jwt_1.sendToken)(newUser, 200, res);
        }
        else {
            (0, jwt_1.sendToken)(user, 200, res);
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserInfo = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    console.log("entered in update user info");
    try {
        const { name, email } = req.body;
        const userId = req.user?._id ? String(req.user._id) : "";
        if (!userId) {
            return next(new Error("User ID is undefined"));
        }
        const user = await user_model_1.default.findById(userId);
        if (name && user) {
            user.name = name;
        }
        await user?.save();
        await redis_1.redis?.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserPassword = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler_1.default("Please enter old and new password", 400));
        }
        const user = await user_model_1.default.findById(req.user?._id).select("+password");
        if (user?.password === undefined) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        const isPasswordMatch = await user.comparePassword(oldPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Old password is incorrect", 401));
        }
        user.password = newPassword;
        await user.save();
        const userId = req.user?._id ? String(req.user._id) : "";
        if (!userId) {
            return next(new Error("User ID is undefined"));
        }
        await redis_1.redis?.set(userId, JSON.stringify(user));
        res.status(200).json({
            success: true,
            message: "Password updated successfully",
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserProfilePicture = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    console.log("entered in update user avatar");
    try {
        console.log("entered in try");
        const { avatar } = req.body;
        const userId = req.user?._id ? String(req.user._id) : "";
        const user = await user_model_1.default.findById(userId);
        if (avatar && user) {
            console.log("entered in if block ");
            //if usere have one avatar then call this
            if (user?.avatar?.public_id) {
                //first we are Deleting the old Image
                await cloudinary_1.default.v2.uploader.destroy(user?.avatar?.public_id);
                const myCloud = await cloudinary_1.default.v2.uploader.upload(avatar, {
                    folder: "lms-avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                };
            }
            else {
                if (avatar) {
                    const myCloud = await cloudinary_1.default.v2.uploader.upload(avatar, {
                        folder: "lms-avatars",
                        width: 150,
                    });
                    user.avatar = {
                        public_id: myCloud.public_id,
                        url: myCloud.secure_url,
                    };
                }
            }
        }
        await user?.save();
        if (!userId) {
            return next(new Error("User ID is undefined"));
        }
        await redis_1.redis.set(userId, JSON.stringify(user));
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        console.log("entered in catch block ");
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get all users ---admin
exports.getAllUsers = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        (0, user_service_1.getAllUsersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//Update usere Role ---admin
exports.updateUserRole = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { id, role } = req.body;
        (0, user_service_1.updateUserRoleService)(res, id, role);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//delete User ---only for admins
exports.deleteUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        if (!id) {
            return next(new ErrorHandler_1.default("User id is required", 400));
        }
        const user = await user_model_1.default.findById(id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 400));
        }
        await user.deleteOne({ id });
        await redis_1.redis.del(String(id));
        res.status(201).json({
            success: true,
            message: "User deleted successfully.",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
