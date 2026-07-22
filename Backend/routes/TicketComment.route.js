const express = require(
    "express"
);

const {
    getComments,
    postComment,
    putComment,
    removeComment
} = require(
    "../controllers/TicketComment.controller"
);

const {
    requireAuth,
    requireAdmin
} = require(
    "../middlewares/auth.middleware"
);

const uploadTicketFile =
    require(
        "../middlewares/uploadTicketFile"
    );

const handleUploadError =
    require(
        "../middlewares/handleUploadError"
    );

const router =
    express.Router({
        mergeParams: true
    });

const processCommentAttachments =
    uploadTicketFile.fields([
        {
            name:
                "archivo",

            maxCount:
                1
        },
        {
            name:
                "carpetaArchivos",

            maxCount:
                100
        }
    ]);

/*
    GET
    /tickets/:ticketId/comments
*/
router.get(
    "/",
    requireAuth,
    getComments
);

/*
    POST
    /tickets/:ticketId/comments
*/
router.post(
    "/",
    requireAuth,
    processCommentAttachments,
    handleUploadError,
    postComment
);

/*
    PUT
    /tickets/:ticketId/comments/:commentId
*/
router.put(
    "/:commentId",
    requireAuth,
    processCommentAttachments,
    handleUploadError,
    putComment
);

/*
    DELETE
    /tickets/:ticketId/comments/:commentId
*/
router.delete(
    "/:commentId",
    requireAuth,
    requireAdmin,
    removeComment
);

module.exports =
    router;