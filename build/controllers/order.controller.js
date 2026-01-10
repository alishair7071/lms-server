"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
require("dotenv").config();
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const redis_1 = require("../utils/redis");
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const order_service_1 = require("../services/order.service");
const dotenv_1 = __importDefault(require("dotenv"));
const Stripe = require("stripe");
// Ensure env is loaded (also done in app.ts / server.ts)
dotenv_1.default.config();
// Safely initialize Stripe so the whole server doesn't crash if the key is missing
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});
//create Model
exports.createOrder = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { courseId, payment_info } = req.body;
        const normalizedCourseId = String(courseId);
        //Verify Stripe Payment Intent if payment_info is provided
        if (payment_info) {
            if ("id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.status !== "succeeded") {
                    return next(new ErrorHandler_1.default("Payment not successfull!", 400));
                }
            }
        }
        //Check if the course is already purchased by the user
        const user = await user_model_1.default.findById(req.user?._id);
        const courseExistInUser = user?.courses?.some((course) => {
            // tolerate historical bad data where `courses` items might be raw ids/strings
            const id = course?.courseId ?? course?._id ?? course;
            if (!id)
                return false;
            return id.toString() === normalizedCourseId;
        });
        if (courseExistInUser) {
            return next(new ErrorHandler_1.default("You have already purchased this course.", 400));
        }
        const course = (await course_model_1.default.findById(courseId));
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found.", 404));
        }
        const data = {
            courseId: course._id,
            userId: user?._id,
            payment_info,
        };
        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
            },
        };
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });
        try {
            if (user) {
                await (0, sendMail_1.default)({
                    email: user.email,
                    subject: "Order Confirmation!",
                    template: "order-confirmation.ejs",
                    data: mailData,
                });
            }
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
        // Store consistently with the user schema: { courseId: string }
        user?.courses.push({ courseId: course._id.toString() });
        await redis_1.redis.set(String(req.user._id), JSON.stringify(user));
        await user?.save();
        course.purchased = (course.purchased || 0) + 1;
        await course.save();
        await notificationModel_1.default.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new Ordr from ${course.name}`,
        });
        (0, order_service_1.newOrder)(data, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get all orders --- only Admin
exports.getAllOrders = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        (0, order_service_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// send stripe-publishable key
exports.sendStripePublishableKey = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    res.status(200).json({
        success: true,
        publishableKey: STRIPE_PUBLISHABLE_KEY
    });
});
//newPayment
exports.newPayment = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        if (!stripe) {
            return next(new ErrorHandler_1.default("Stripe is not configured on the server. Please contact support.", 500));
        }
        const myPayment = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: 'USD',
            metadata: {
                company: "ELearning",
            },
            automatic_payment_methods: {
                enabled: true,
            }
        });
        res.status(201).json({
            client_secret: myPayment.client_secret,
            success: true
        });
        console.log("myPayment", myPayment);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
