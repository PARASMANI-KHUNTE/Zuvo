const auth = require("./services/auth/src/controllers/auth");
console.log("Exports from auth controller:");
Object.keys(auth).forEach(k => console.log(`- ${k}: ${typeof auth[k]}`));
