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
    schema.pre(/^find/, function () {
        const query = this.getQuery();
        if (query.includeDeleted) {
            delete query.includeDeleted;
            return;
        }
        this.where({ isDeleted: false });
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
