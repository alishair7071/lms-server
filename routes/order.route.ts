import express from "express";
import { createOrder, getAllOrders, newPayment, sendStripePublishableKey } from "../controllers/order.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { updateAccessToken } from "../controllers/user.controller";
const orderRouter = express.Router();

orderRouter.post("/create-order", updateAccessToken, isAuthenticated, createOrder);

orderRouter.get(
  "/get-all-orders",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllOrders
);

orderRouter.get('/payment/stripePublishAbleKey', sendStripePublishableKey);
// Use refresh-token flow so users with an expired access token can still pay
orderRouter.post('/payment/process', updateAccessToken, isAuthenticated, newPayment);

export default orderRouter;
