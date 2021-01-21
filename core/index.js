module.exports = {

    SERVER_SECRET: process.env.SECRET || "1234",
    MONGOOSE_DBURI: process.env.MONGOOSE_DBURI,
    SERVICE_ACCOUNT: JSON.parse(process.env.SERVICEACCOUNT)
   
}