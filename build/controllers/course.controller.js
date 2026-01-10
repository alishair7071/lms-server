"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoUrl = exports.deleteCourse = exports.getAllCoursesAdmin = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addQuestionToCourse = exports.getCourseByUser = exports.getAllCourses = exports.getSingleCourse = exports.editCourse = exports.uploadCourse = void 0;
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const course_service_1 = require("../services/course.service");
const cloudinary_1 = __importDefault(require("cloudinary"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const mongoose_1 = __importDefault(require("mongoose"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const path_1 = __importDefault(require("path"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const axios_1 = __importDefault(require("axios"));
//Upload Courses
exports.uploadCourse = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "lms-courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        (0, course_service_1.createCourse)(data, res, next);
    }
    catch (error) {
        console.log("error in course upload:", error);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// Edit Course
exports.editCourse = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = (await course_model_1.default.findById(courseId));
        if (thumbnail) {
            // Handle both legacy `publicId` and current `public_id` field names
            const existingPublicId = courseData?.thumbnail?.public_id || courseData?.thumbnail?.publicId;
            if (existingPublicId) {
                await cloudinary_1.default.v2.uploader.destroy(existingPublicId);
            }
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "lms-courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        /* if (thumbnail) {
          data.thumbnail = {
            public_id: courseData?.thumbnail.public_id,
            url: courseData?.thumbnail.url,
          };
        }*/
        const course = await course_model_1.default.findByIdAndUpdate(courseId, { $set: data }, { new: true });
        /* if (redis) {
          await redis.del(`course:${courseId}`);
          await redis.del("allCourses");
        }*/
        res.status(201).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
//get single course ---without purchasing
exports.getSingleCourse = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const courseIdParam = req.params.id;
        const courseId = Array.isArray(courseIdParam) ? courseIdParam[0] : courseIdParam;
        if (!courseId) {
            return next(new ErrorHandler_1.default("Course id is required", 400));
        }
        const isCacheExits = await redis_1.redis.get(courseId);
        if (isCacheExits) {
            const course = JSON.parse(isCacheExits);
            res.status(200).json({
                success: true,
                course,
            });
        }
        else {
            const course = await course_model_1.default.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
            res.status(200).json({
                success: true,
                course,
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
//get all courses to Just Show
exports.getAllCourses = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        /*const isCacheExits = await redis.get("allCourses");
        if (isCacheExits) {
          const course = JSON.parse(isCacheExits);
          res.status(200).json({
            success: true,
            course,
          });
          */
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestions -courseData.questions -courseData.links");
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
//get course Content ---only for valid users
exports.getCourseByUser = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;
        const courseExist = userCourseList?.find((course) => {
            // tolerate historical bad data where `courses` items might be raw ids/strings
            const id = course?.courseId ?? course?._id ?? course;
            if (!id)
                return false;
            return id.toString() === courseId.toString();
        });
        if (!courseExist) {
            return next(new ErrorHandler_1.default("You are not eligible to access this course.", 404));
        }
        const course = await course_model_1.default.findById(courseId);
        const content = course?.courseData;
        res.status(200).json({
            success: true,
            content,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addQuestionToCourse = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { question, courseId, contentId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id.", 400));
        }
        const courseContent = course?.courseData.find((content) => content._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Content not found.", 404));
        }
        const newQuestion = {
            user: req.user,
            question,
            questionReplies: [],
        };
        courseContent.questions.push(newQuestion);
        const notification = await notificationModel_1.default.create({
            user: req.user?._id,
            title: "New Question Recived",
            message: `You have a new question in  ${courseContent?.title}`,
        });
        course?.save();
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addAnswer = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { answer, courseId, contentId, questionId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id.", 400));
        }
        const courseContent = course?.courseData.find((content) => content._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Content not found.", 404));
        }
        const question = courseContent.questions.find((q) => q._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler_1.default("Invalid question Id.", 401));
        }
        //create an answer object
        const newAnswer = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        question?.questionReplies?.push(newAnswer);
        await course?.save();
        if (req.user?._id === question.user?._id) {
            //create a notification
            await notificationModel_1.default.create({
                user: req.user?._id,
                title: "New Question Reply Recived",
                message: `You have a new reply in  ${courseContent?.title}`,
            });
        }
        else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
            };
            const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/questionReply.ejs"), data);
            try {
                await (0, sendMail_1.default)({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "questionReply.ejs",
                    data,
                });
            }
            catch (error) {
                return next(new ErrorHandler_1.default(error.message, 500));
            }
        }
        res.status(200).json({
            success: true,
            course: course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReview = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseIdParam = req.params.id;
        const courseId = Array.isArray(courseIdParam) ? courseIdParam[0] : courseIdParam;
        if (!courseId) {
            return next(new ErrorHandler_1.default("Course id is required", 400));
        }
        //check if the course id exist in then UserCourseList based on the _id
        const courseExists = userCourseList?.find((course) => course?.courseId?.toString() === courseId);
        if (!courseExists) {
            return next(new ErrorHandler_1.default("You are not eligible for this course", 403));
        }
        const course = await course_model_1.default.findById(courseId);
        const { review, rating } = req.body;
        const ReviewData = {
            user: req.user,
            comment: review,
            rating: rating,
        };
        course?.reviews.push(ReviewData);
        let avg = 0;
        course?.reviews.forEach((rev) => {
            avg += rev.rating;
        });
        if (course) {
            course.ratings = avg / course.reviews.length;
        }
        await course?.save();
        await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
        await notificationModel_1.default.create({
            user: req.user?._id,
            title: "New Review Received",
            message: `${req.user?.name} has given a new review for ${course?.name}`,
        });
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReplyToReview = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const { comment, courseId, reviewId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!courseId) {
            return next(new ErrorHandler_1.default("Course not found.", 404));
        }
        const review = course?.reviews.find((rev) => rev._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler_1.default("Review not found", 400));
        }
        const replyData = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies.push(replyData);
        await redis_1.redis.set(courseId, JSON.stringify(course), 'EX', 604800);
        await course?.save();
        res.status(201).json({
            success: true,
            course
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get all courses ---admin
exports.getAllCoursesAdmin = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        (0, course_service_1.getAllCoursesService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//delete Course ---only for admins
exports.deleteCourse = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        if (!id) {
            return next(new ErrorHandler_1.default("Course id is required", 400));
        }
        const course = await course_model_1.default.findById(id);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 400));
        }
        await course.deleteOne();
        await redis_1.redis.del(String(id));
        res.status(201).json({
            success: true,
            message: "Course deleted successfully."
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// generate video url
exports.generateVideoUrl = (0, catchAsyncErrors_1.catchAsyncErrors)(async (req, res, next) => {
    console.log("req.body", req.body);
    try {
        const { videoId } = req.body;
        if (!videoId) {
            return next(new ErrorHandler_1.default("videoId is required", 400));
        }
        if (!process.env.VDOCIPHER_API_SECRET) {
            return next(new ErrorHandler_1.default("VDOCIPHER_API_SECRET is not configured on the server", 500));
        }
        const response = await axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
            ttl: 300,
        }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        console.log("error", error);
        const apiMessage = error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.response?.data ||
            error?.message ||
            "Failed to generate VdoCipher OTP";
        return next(new ErrorHandler_1.default(typeof apiMessage === "string" ? apiMessage : JSON.stringify(apiMessage), 400));
    }
});
