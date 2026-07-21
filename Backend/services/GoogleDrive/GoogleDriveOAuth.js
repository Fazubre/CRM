const {
    createDriveClient,
    generateDriveAuthUrl,
    getTokensFromCode
} = require("./GoogleDriveClient");

const {
    createDriveFolderWithOAuth,
    createTicketDriveStructureWithOAuth,
    createCommentDriveFolderWithOAuth
} = require("./GoogleDriveFolders");

const {
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth,
    getDriveItemWithOAuth,
    moveDriveItemWithOAuth,
    deleteDriveItemWithOAuth
} = require("./GoogleDriveFiles");

module.exports = {
    createDriveClient,
    generateDriveAuthUrl,
    getTokensFromCode,

    createDriveFolderWithOAuth,
    createTicketDriveStructureWithOAuth,
    createCommentDriveFolderWithOAuth,

    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth,
    getDriveItemWithOAuth,
    moveDriveItemWithOAuth,
    deleteDriveItemWithOAuth
};