const mongoose = require('mongoose'),
    reqString = { type: String, required: true },
    nonreqString = { type: String, required: false },
    reqNumber = { type: Number, required: true },
    reqBoolean = { type: Boolean, required: true, default: false },
    moment = require('moment'),
    now = new Date(),
    dateStringWithTime = moment(now).format('YYYY-MM-DD HH:MM:SS');

const projectSchema = new mongoose.Schema({
    teamName: reqString,
    teamCategory: reqString,
    teamJudge: reqString,
    teamJudgeEmail: reqString,
    teamTable: reqString,
    score1: reqNumber,
    score2: reqNumber,
    score3: reqNumber,
    score4: reqNumber,
    score5: reqNumber,
    date: {
        type: String,
        default: dateStringWithTime
    },
    currentProject: reqNumber
})

module.exports = mongoose.model("Projects", projectSchema)