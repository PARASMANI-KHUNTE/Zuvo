const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    resource: {
        type: String,
        required: true
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    requestId: String
}, { timestamps: true });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

/**
 * Log an enterprise-grade audit trail
 */
const logAudit = async (data) => {
    try {
        await AuditLog.create(data);
    } catch (err) {
        // We log the error but don't break the main flow
        console.error("Audit Log Failure:", err.message);
    }
};

module.exports = { AuditLog, logAudit };
