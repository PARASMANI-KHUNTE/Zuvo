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

    // Middleware to exclude non-active documents by default
    schema.pre(/^find/, function () {
        const query = this.getQuery();

        // If query explicitly wants to bypass filters (e.g., for login or admin)
        if (query.includeAllStates) {
            delete query.includeAllStates;
            return;
        }

        // Only include active accounts by default
        this.where({ accountStatus: "active" });
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
