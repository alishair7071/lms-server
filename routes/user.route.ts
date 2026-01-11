import express from "express";
import {
  activateUser,
  deleteUser,
  getAllUsers,
  getUserInfo,
  LoginUser,
  logoutUser,
  registrationUser,
  socialAuth,
  updateAccessToken,
  updateUserInfo,
  updateUserPassword,
  updateUserProfilePicture,
  updateUserRole,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post("/registration", registrationUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login", LoginUser);
// Logout should always be callable (even if access token is expired/missing)
// so the client can clear cookies and local session state reliably.
userRouter.get("/logout", logoutUser);
// Refresh endpoint: updates cookies via updateAccessToken and returns the latest user/token
userRouter.get("/refresh", updateAccessToken, (req, res) => {
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
userRouter.get("/me", updateAccessToken, isAuthenticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-user-info", isAuthenticated, updateUserInfo);
userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);
userRouter.put(
  "/update-user-avatar",
  updateAccessToken,
  isAuthenticated,
  updateUserProfilePicture
);

userRouter.get(
  "/get-all-users",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);


userRouter.put(
  "/update-user-role",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateUserRole
);


userRouter.delete(
  "/delete-user/:id",
  updateAccessToken,
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  deleteUser
);
export default userRouter;
