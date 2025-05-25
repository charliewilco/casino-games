// @ts-check
/** @type {import('jest').Config} */
module.exports = {
	rootDir: "..", // ← Important: sets root of project relative to this config file
	testMatch: ["<rootDir>/test/**/*.(spec|test).[jt]s"],
	transform: {
		"^.+\\.(t|j)sx?$": "@swc/jest",
	},
};
