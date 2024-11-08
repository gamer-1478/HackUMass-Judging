require("dotenv").config()
const express = require('express')
const app = express()
const session = require('cookie-session');
const passport = require('passport');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const ejs = require('ejs');
const ejsLayouts = require('express-ejs-layouts');
const cors = require('cors');
const passportInit = require('./middleware/passport.js');
const path = require('node:path');
const csv = require("csvtojson");

//file imports
const authRouter = require('./routes/authRouter');
const { ensureAuthenticated } = require("./middleware/auth.js");
const userSchema = require("./schemas/userSchema.js");
const projectSchema = require("./schemas/projectSchema.js");

//prod stuff (DO NOT TOUCH)
if (process.env.NODE_ENV === 'production') {
    app.enable('trust proxy');
}
else {
    app.disable('trust proxy');
}

//cors middleware
const corsOptions = {
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true
}
app.use(cors(corsOptions))

//middlewares
app.use(express.json({ limit: '50mb' }), express.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static('public'))
app.use(express.static('songs'))
app.use(ejsLayouts)

//set views as ejs
app.set('view engine', 'ejs')
app.set('views', 'views')


//cookie stuff (DO NOT TOUCH)
if (process.env.NODE_ENV === 'production') {
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        sameSite: 'none',
        overwrite: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }));
} else {
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }));
}
app.use(cookieParser(process.env.SESSION_SECRET));

passportInit(passport)

//initialize passport after thiss
app.use(passport.initialize());
app.use(passport.session());

//connect to mongodb
const dbUri = process.env.MONGO_URI
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(console.log("Connected to mongodb"))

//parse csv files
var CsvfileJudges = ("./datafiles/judges_auth.csv");
var CsvfileAssignments = ("./datafiles/assignments.csv");
var CsvfileTeams = ("./datafiles/team.csv");
CsvfileJudges = path.resolve(CsvfileJudges)
CsvfileAssignments = path.resolve(CsvfileAssignments)
CsvfileTeams = path.resolve(CsvfileTeams)

csv().fromFile(CsvfileAssignments).then((jsonObj) => { CsvfileAssignments = jsonObj })
csv().fromFile(CsvfileTeams).then((jsonObj) => { CsvfileTeams = jsonObj })
csv().fromFile(CsvfileJudges).then((jsonObj) => { CsvfileJudges = jsonObj })

//routing
app.get("/", (req, res) => {
    res.redirect("/auth/login")
})

app.use("/auth", authRouter);

app.get("/dashboard", ensureAuthenticated, async (req, res) => {
    userSchema.findOne({ email: req.user.Judge_Email }).then(async (user) => {
        if (!user) {
            userSchema.create({
                email: req.user.Judge_Email,
                name: req.user.Judge,
                currentProject: 1
            }).then(() => {
                res.redirect("/dashboard")
            })
        }
        else {
            var ListOfAssignments = CsvfileAssignments.find(assignment => assignment.Judge === req.user.Judge);
            var slot = "Slot " + user.currentProject;

            var currentSlot = ListOfAssignments[slot];
            if (!currentSlot) {
                res.redirect("/thankyou")
            } else {
                //orignal = mqv (Table 1)
                currentSlot = currentSlot.substring(currentSlot.indexOf(' ') + 1) //(Table 1)
                currentSlot = currentSlot.substring(currentSlot.indexOf(' ') + 1); // 1)
                currentSlot = currentSlot.replace(")", ""); //1

                var currentTeam = CsvfileTeams.find(team => team.tableNumber == currentSlot);
                console.log(currentTeam);
                res.render("judge.ejs", { "currentProject": currentTeam.teamName, "currentTable": currentTeam.tableNumber, "currentProjectCategory": currentTeam.categoryApplied })
            }
        }
    })
})

app.post("/dashboard", ensureAuthenticated, async (req, res) => {
    var { score1, score2, score3, score4, score5, score6, comments } = req.body;
    console.log(req.body);
    var CurrentJudge = await userSchema.findOne({ email: req.user.Judge_Email });

    var ListOfAssignments = CsvfileAssignments.find(assignment => assignment.Judge === req.user.Judge);
    var slot = "Slot " + CurrentJudge.currentProject;

    var currentSlot = ListOfAssignments[slot];
    //orignal = mqv (Table 1)
    currentSlot = currentSlot.substring(currentSlot.indexOf(' ') + 1) //(Table 1)
    currentSlot = currentSlot.substring(currentSlot.indexOf(' ') + 1); // 1)
    currentSlot = currentSlot.replace(")", ""); //1

    var CurrentTeam = await CsvfileTeams.find(team => team.tableNumber == currentSlot);

    projectSchema.create({
        teamName: CurrentTeam.teamName,
        teamCategory: CurrentTeam.categoryApplied,
        teamJudge: req.user.Judge,
        teamJudgeEmail: req.user.Judge_Email,
        teamTable: currentSlot,
        score1,
        score2,
        score3,
        score4,
        score5,
        score6,
        comments
    }).then(() => {
        CurrentJudge.updateOne({ currentProject: CurrentJudge.currentProject + 1 }).then(() => {
            res.redirect("/dashboard");
        })
    })
})

app.get("/404", (req, res) => {
    res.render("404.ejs")
})

app.get("/thankyou", (req, res) => {
    res.render("thankyou.ejs")
})

app.get("*", (req, res) => {
    res.redirect("/404")
})
//listen
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Connected on port ${PORT}`))