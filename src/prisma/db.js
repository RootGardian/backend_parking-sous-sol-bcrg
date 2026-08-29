"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
require("dotenv/config");
var runtime_1 = require("@prisma/orm-postgres/runtime");
var contract_json_1 = require("./contract.json");
exports.db = (0, runtime_1.default)({
    contractJson: contract_json_1.default,
    url: process.env['DATABASE_URL'],
});
