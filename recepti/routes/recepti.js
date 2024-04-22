let express = require('express');
let router = express.Router();

const fileStream = require('fs');

//Създаване на сесия след успешен Login
session = require('express-session'); 
router.use(session({
    secret: 'random string',
    resave: true,
    saveUninitialized: true,
}));

//new sql
sqlite3 = require('sqlite3');
db = new sqlite3.Database('recepti.sqlitedb');
db.serialize();
db.run(`CREATE TABLE IF NOT EXISTS recepti(
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
    title TEXT,
    img TEXT,
    col_sustavki TEXT,
    vreme TIME,
    opisanie TEXT,
    date_created TEXT)`
);
db.parallelize();

fileUpload = require('express-fileupload');
router.use(fileUpload());

bcrypt = require('bcryptjs');
users = require('./passwd.json');

//Показване на Login форма
router.get('/login', function(req, res) 
{
    res.render('login', {info: 'Please Log In.'});
});

router.post('/login', function(req, res){
    bcrypt.compare(req.body.password, users[req.body.username] || "", function(err, is_match) 
	{
        if(err) throw err;
        if(is_match === true) 
		{
            req.session.username = req.body.username;
            req.session.count = 0;
            res.redirect("/");
        } 
		else 
		{
            res.render('login', {warn: 'Try Again.'});
        }
    });
});

//Logout - унищожаване на сесия
router.get('/logout', (req, res) => 
{
    req.session.destroy();
    res.redirect("/");
});

router.all('*', function(req, res, next) 
{
    if(!req.session.username)
	{
        res.redirect("/login");
        return;
    }
        next();
});


//CRUD
//cREADud
router.get('/', function(req, res, next) 
{
    req.session.count++;
    s =  "Welcome, " + req.session.username +"!";
	
	 db.all('SELECT * FROM recepti WHERE user = ? ORDER BY date_created DESC;', req.session.username, function(err, rows) {
        if(err) throw err;
        res.render('recepti', { info: s, rows: rows });
    });
});

//CREATErud + Picture upload
router.post('/upload',(req, res) => {
    img = "";
    if(req.files && req.files.img) {
        req.files.img.mv('./public/images/' + req.files.img.name, (err) => {
            if (err) throw err;
        });
        img = '/images/' + req.files.img.name;
    }

    db.run(`
    INSERT INTO recepti(
        user,
        title,
        img,
        col_sustavki,
        vreme,
        opisanie,
        date_created
    ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        DATETIME('now','localtime'));
    `,

    [req.session.username, req.body.title, img, req.body.col_sustavki, req.body.vreme, req.body.opisanie],
    (err) => {
        if(err) throw err;
        res.redirect('/');
    });
});

//cruDELETE
router.post('/delete', (req, res) => {
    db.run('DELETE FROM recepti WHERE id = ?', req.body.id, (err) => {
        if(err) throw err;
        res.redirect('/');
    });
});

//crUPDATEd
router.post('/update', (req, res) => {
    db.run(`UPDATE recepti
        SET user = ?,
            title = ?,
            col_sustavki = ?,
            vreme = ?,
            opisanie = ?
        WHERE id = ?;`,
        req.session.username,
        req.body.title,
        req.body.col_sustavki,
        req.body.vreme,
        req.body.opisanie,
        req.body.id,
        (err) => {
            if(err) throw err;
            res.redirect('/');
    });
});

router.all('*', function(req, res) {
    res.send("No such page or action! Go to: <a href='/'>main page</a>");
});


module.exports = router;