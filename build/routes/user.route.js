"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const userRouter = express_1.default.Router();
userRouter.post("/registration", user_controller_1.registrationUser);
userRouter.post("/activate-user", user_controller_1.activateUser);
userRouter.post("/login", user_controller_1.LoginUser);
// Logout should always be callable (even if access token is expired/missing)
// so the client can clear cookies and local session state reliably.
userRouter.get("/logout", user_controller_1.logoutUser);
// Refresh endpoint: updates cookies via updateAccessToken and returns the latest user/token
userRouter.get("/refresh", user_controller_1.updateAccessToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Could not Refresh token",
        });
    }
    return res.status(200).json({
        success: true,
        accessToken: res.locals.accessToken,
        user: res.locals.user,
    });
});
// Ensure user info works even if access token expired (refresh first)
userRouter.get("/me", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.getUserInfo);
userRouter.post("/social-auth", user_controller_1.socialAuth);
userRouter.put("/update-user-info", auth_1.isAuthenticated, user_controller_1.updateUserInfo);
userRouter.put("/update-user-password", auth_1.isAuthenticated, user_controller_1.updateUserPassword);
userRouter.put("/update-user-avatar", user_controller_1.updateAccessToken, auth_1.isAuthenticated, user_controller_1.updateUserProfilePicture);
userRouter.get("/get-all-users", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.getAllUsers);
userRouter.put("/update-user-role", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.updateUserRole);
userRouter.delete("/delete-user/:id", user_controller_1.updateAccessToken, user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.deleteUser);
exports.default = userRouter;
