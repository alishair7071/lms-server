"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLast12MonthsData = generateLast12MonthsData;
async function generateLast12MonthsData(model) {
    const last12Months = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    for (let i = 0; i < 12; i++) {
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = startDate.toLocaleString("default", {
            month: "short",
            year: "numeric",
        });
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lt: endDate,
            },
        });
        last12Months.push({ month: monthYear, count });
    }
    return { last12Months };
}
