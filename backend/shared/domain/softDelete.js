/**
 * Mongoose Soft Delete Plugin
 * Standardizes soft deletion across all collections
 */
module.exports = function softDeletePlugin(schema) {
    const isIdentityModel = !!schema.path("accountStatus");

    if (isIdentityModel) {
        // Identity Model logic (State machine based)
        schema.pre(/^find/, function () {
            const query = this.getQuery();
            if (query.includeAllStates) {
                delete query.includeAllStates;
                return;
            }
            this.where({ accountStatus: "active" });
        });

        schema.methods.deactivate = async function () {
            this.accountStatus = "deactivated";
            return this.save();
        };

        schema.methods.scheduleDeletion = async function () {
            this.accountStatus = "pending_deletion";
            this.deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return this.save();
        };

        schema.methods.activate = async function () {
            this.accountStatus = "active";
            this.deletionScheduledAt = null;
            return this.save();
        };
    } else {
        // Content Model logic (Boolean based)
        schema.add({
            isDeleted: { type: Boolean, default: false, index: true },
            deletedAt: { type: Date, default: null }
        });

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
    }
};
