/**
 * Mongoose Soft Delete Plugin
 * Standardizes soft deletion across all collections
 */
module.exports = function softDeletePlugin(schema) {
    schema.add({
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedAt: {
            type: Date,
            default: null
        }
    });

    // Middleware to exclude deleted documents by default
    schema.pre(/^find/, function (next) {
        if (this.getQuery().includeDeleted) {
            delete this.getQuery().includeDeleted;
            return next();
        }
        this.where({ isDeleted: false });
        next();
    });

    schema.methods.softDelete = async function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
    };

    schema.methods.restore = async function () {
        this.isDeleted = false;
        this.deletedAt = null;
        return this.save();
    };
};
