const express = require('express')
const {openDb} = require("./db")

const session = require('express-session');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
//const { get } = require('node:http');
//const SQLiteStore = require('connect-sqlite3')(session);
var sess = {
  secret: 'keyboard cat',
  cookie: {}
};


const port = 3000;

app.use(session(sess));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.set('view engine', 'jade');





app.get('/debug',async (req, res) => {
  res.send("debug");
});



///////////////////////////////////////////////////////////
///////////////         LOGIN      ////////////////////////
///////////////////////////////////////////////////////////
app.get('/login',(req, res) => {
  res.render('login', {logged: req.session.logged})
});

app.post('/login',async (req, res) => {
  const mail = req.body.mail;
  const password = req.body.password;
  const db = await openDb();
  const authentification = await db.get(`
    SELECT mail, password FROM user
    WHERE mail=?
  `,[mail]);
  if(typeof(authentification)=='undefined' || password != authentification.password){
    let data = {
      error: "Le login est incorrect !",
      logged: false
    };
    res.render('login',data);
  } else {
    req.session.logged = true;
    const query = await db.get(`
      SELECT name FROM user
      WHERE mail = ?
    `,[mail]);
    req.session.username = query.name;
    let data = {
      success: "Vous êtes log",
      logged: true
    };
    res.redirect(302,'/');
  }

});
////////////////////////////////////////////////////////////
///////////////         SIGNIN      ////////////////////////
////////////////////////////////////////////////////////////
app.get('/signin',(req,res)=> {
  res.render('signin');
});

app.post('/signin',async (req,res)=>{
  const db = await openDb();
  const username =req.body.username;
  const mail = req.body.mail;
  const password = req.body.password;

  const mail_existant = await db.get(`
    SELECT mail FROM user
    WHERE mail=?
  `,[mail]);
  if(
    mail_existant && mail_existant.mail == mail) {
      data = {error: 'le mail est déja associé a un compte'};
      res.render('signin',data);
    } else {
      //creation de compte reussie
      await db.run(`
        INSERT INTO user(name, mail, password)
        VALUES (?, ?, ?)
        `,[username,mail,password]);
      req.session.logged = true;
      req.session.username = username;
      res.redirect(302,'/');
    }

})
////////////////////////////////////////////////////////////
///////////////         LOGOUT    //////////////////////////
////////////////////////////////////////////////////////////

app.get('/logout',(req, res) => {
  req.session.logged = false
  res.redirect(302,'/login')
});


////////////////////////////////////////////////////////////
///////////////         CREATE A POST      /////////////////
////////////////////////////////////////////////////////////

app.get('/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  res.render("create",{content:'',category:'',url:''});
});

app.post('/post', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  const db = await openDb();
  const content = req.body.content;
  const category = req.body.category;
  const author = req.session.username;
  const date = Date.now();
  const post = await db.run(`
    INSERT INTO posts(content, author, date, category)
    VALUES(?, ?, ?, ?)
  `,[content,author,date,category]);
  const query = await db.get(`
    SELECT id AS id FROM posts ORDER BY id DESC LIMIT 1
  `);
  res.redirect("/post/" + (query.id));
});

////////////////////////////////////////////////////////////
///////////////        EDIT A POST    ///////////////////////
////////////////////////////////////////////////////////////
app.get('/edit/:p', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  if (typeof(req.params.p)=='undefined'){res.send('post non spécifié');return;}
  const p = req.params.p;
  const db = await openDb();
  let query = await db.get(`
    SELECT category, content, author FROM posts
    WHERE id = ?
  `,[p]);
  if (typeof(query.author)=='undefined'){res.send('post supprimé');return;}
  if (query.author != req.session.username){res.send("Vous n'etes pas proprietaires");return;}
  query.url='/'+p;
  res.render("create",query);
});

app.post('/post/:p', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  if (typeof(req.params.p)=='undefined'){res.send('post non spécifié');return;}

  const p = req.params.p;
  const db = await openDb();
  let content=req.body.content;
  content+=' [modifié]';
  let query = await db.get(`
  SELECT author FROM posts
  WHERE id = ?
  `,[p]);
  if (typeof(query.author)=='undefined'){res.send('post supprimé');return;}
  if (query.author != req.session.username){res.send("Vous n'etes pas proprietaires");return;}
  query = await db.run(`
    UPDATE posts SET content=?, category=?, date=?
    WHERE id = ?
  `,[content,req.body.category,Date.now(),p]);
 res.redirect(302,'/post/'+p);
});

////////////////////////////////////////////////////////////
///////////////         GET ACCUEIL       //////////////////
////////////////////////////////////////////////////////////

app.get('/', async (req,res) =>{
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  const author = req.session.username;

  const db = await openDb();
  const posts = await db.all(`
    SELECT id, content, author, date, category  FROM posts
    WHERE date> ?
    ORDER BY date
  `,[Date.now()-24*3600*1000]);

  //nombre de commentaires et score
  for (let post of posts) {
    let data;
    data = await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ?
    `,[post.id]);
    post.comments_count = data.n;
    data = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND post_id = ?
    `,[post.id]);
    let upvote = data.upvote;
    data = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND post_id = ?
  `,[post.id]);
    let downvote = data.downvote;
    post.score= upvote - downvote;
    if(post.score>0){post.score='+'+post.score}
    let a = new Date();
    a.setTime(post.date);
    post.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');
  }

  //interactions récentes
  const posts_ecrits = await db.all(`
    SELECT id, content FROM posts
    WHERE author = ?
  `,[author]);
  const posts_commentes = await db.all(`
    SELECT posts.id AS id, posts.content AS content FROM comments
    JOIN posts ON comments.post_id=posts.id
    WHERE comments.author = ? AND posts.author NOT LIKE ?
  `,[author,author]);

  news = [];
  for (let post of posts_ecrits) {
    const comments =  await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ? AND date > ?
      `,[post.id,Date.now()-24*3600*1000]);
    post.start=post.content.substring(0, 20)+'...';
    post.comments_count = comments.n;
    if(post.comments_count>0){news.push(post);}
  }
  for (let post of posts_commentes) {
    const comments =  await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ? AND date > ?
    `,[post.id,Date.now()-24*3600*1000]);
    post.start=post.content.substring(0, 20)+'...';
    post.comments_count = comments.n;
    if(post.comments_count>0){news.push(post);}
  }
  res.render('index',{posts: posts, news: news, name: req.session.username});
});


////////////////////////////////////////////////////////////
///////////////        POST      //////////////////////////
////////////////////////////////////////////////////////////

app.get('/post/:p', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }

  const db = await openDb();
  const p = req.params.p;
  let post = await db.get(`
    SELECT author, date, category, content, id FROM posts
    WHERE id = ?
  `,[p]);
  //le post n'existe pas
  if (typeof(post)=='undefined'){res.send('erreur le post n\'existe pas');return;}

  //score post
  let query;
  query = await db.get(`
    SELECT COUNT(user_id) AS upvote FROM votes
    WHERE type = 'upvote' AND post_id = ?
  `,[p]);
  let upvote = query.upvote;
  query = await db.get(`
    SELECT COUNT(user_id) AS downvote FROM votes
    WHERE type = 'downvote' AND post_id = ?
  `,[p]);
  let downvote = query.downvote;
  post.score= upvote - downvote;

  //date post
  let a = new Date();
  a.setTime(post.date);
  post.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');

//commentaire
  let comments = await db.all(`
    SELECT author, date, content, id FROM comments
    WHERE post_id = ?
  `,[p]);

  for (let comment of comments) {
    let a = new Date();
    a.setTime(comment.date);
    comment.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');

    //score comment
    let query;
    query = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND comment_id = ?
    `,[comment.id]);
    let upvote = query.upvote;
    query = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND comment_id = ?
  `,[comment.id]);
    let downvote = query.downvote;
    comment.score= upvote - downvote;
  }
  post.comments = comments;
  post.name=req.session.username;
  //retour
  res.render("post",post);
});

////////////////////////////////////////////////////////////
///////////////        ADD COMMENT TO A POST   /////////////
////////////////////////////////////////////////////////////
app.post('/comment/:p', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }

  const db = await openDb();
  const p = req.params.p;
  const content = req.body.comment;

  //ajout du commentaire
  const query = await db.run(`
    INSERT INTO comments(content, author, date, post_id)
    VALUES(?, ?, ?, ?)
  `,[content,req.session.username,Date.now(),p]);

  //retour au post sur lequelle on ajoute un commentaire
  res.redirect("/post/"+p);
});



////////////////////////////////////////////////////////////
///////////////        DELETE POST    //////////////////////
////////////////////////////////////////////////////////////

app.get('/delete/:p', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }

  const db = await openDb();
  const author = req.session.username;
  const p = req.params.p;
  let query = await db.get(`
    SELECT author FROM posts
    WHERE id = ?
  `,[p]);

  //post n'est plus dans la base de donnée
  if(typeof(query.author)=='undefined'){res.send('post inexistant');return;}

  //quelqu'un souhaite supprimer un post qu'il n'a pas écrit
  if(author != query.author){res.send("Vous n'etes pas proprietaire du post");return;}

  //suppression du post
  query = await db.run(`
    DELETE FROM posts
    WHERE id=?
  `,[p]);

  //suppression des commentaires du post
  query = await db.run(`
  DELETE FROM comments
  WHERE post_id=?
  `,[p]);

  //retour à l'accueil
  res.redirect("/");
});
////////////////////////////////////////////////////////////
///////////////        PROFILE     /////////////////////////
////////////////////////////////////////////////////////////
app.get('/profil', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }
  const db = await openDb();
  let userinfo= await db.get(`
    SELECT name, mail FROM user
    WHERE name=?
  `,[req.session.username]);


  let posts = await db.all(`
  SELECT content, category, date, id FROM posts
  WHERE author=?
  `,[req.session.username]);
  let comments = await db.all(`
    SELECT id FROM comments
    WHERE author = ?
  `,[req.session.username]);

  //score total
  let score =0;

  for (let post of posts) {

    //score post
    let query;
    //upvote
    query = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND post_id = ?
    `,[post.id]);
    let upvote = query.upvote;
    //downvote
    query = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND post_id = ?
    `,[post.id]);
    let downvote = query.downvote;
    post.score= upvote - downvote;
    score+= post.score;

    //date post
    let a = new Date();
    a.setTime(post.date);
    post.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');

    //nb comments post
    let data;
    data = await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ?
    `,[post.id]);
    post.comments_count = data.n;
  }

  for (let comment of comments) {
    //score de chaque commentaire
    let query;
    //upvote
    query = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND comment_id = ?
    `,[comment.id]);
    let upvote = query.upvote;
    //downvote
    query = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND comment_id = ?
    `,[comment.id]);
    let downvote = query.downvote;
    comment.score= upvote - downvote;
    score+=comment.score;
  }
  if(score>0){score='+'+score;}
  let userprofile={};
  userprofile.name=userinfo.name;
  userprofile.mail=userinfo.mail;
  userprofile.score=score;
  userprofile.posts=posts;
  res.render('profil',userprofile);
});

////////////////////////////////////////////////////////////
///////////////         CATEGORY       //////////////////
////////////////////////////////////////////////////////////

app.get('/category/:cat', async (req,res) =>{
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }

  const category = req.params.cat;
  const db = await openDb();
  const posts = await db.all(`
    SELECT id, content, author, date, category  FROM posts
    WHERE category = ?
  `,[category]);

  //nombre de commentaires et score
  for (let post of posts) {
    let data;
    data = await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ?
    `,[post.id]);
    post.comments_count = data.n;
    data = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND post_id = ?
    `,[post.id]);
    let upvote = data.upvote;
    data = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND post_id = ?
  `,[post.id]);
    let downvote = data.downvote;
    post.score= upvote - downvote;
    if(post.score>0){post.score='+'+post.score}
    let a = new Date();
    a.setTime(post.date);
    post.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');
  }

  res.render('category',{posts: posts, name: req.session.username, category: category});
});


////////////////////////////////////////////////////////////
///////////////         CATEGORY       //////////////////
////////////////////////////////////////////////////////////

app.get('/user/:user', async (req,res) =>{
  if(!req.session.logged){
    res.redirect(302,'/login');
    return;
  }

  const author = req.params.user;
  const db = await openDb();
  const posts = await db.all(`
    SELECT id, content, author, date, category  FROM posts
    WHERE author = ?
  `,[author]);

  //nombre de commentaires et score
  for (let post of posts) {
    let data;
    data = await db.get(`
      SELECT COUNT(id) AS n FROM comments
      WHERE post_id = ?
    `,[post.id]);
    post.comments_count = data.n;
    data = await db.get(`
      SELECT COUNT(user_id) AS upvote FROM votes
      WHERE type = 'upvote' AND post_id = ?
    `,[post.id]);
    let upvote = data.upvote;
    data = await db.get(`
      SELECT COUNT(user_id) AS downvote FROM votes
      WHERE type = 'downvote' AND post_id = ?
  `,[post.id]);
    let downvote = data.downvote;
    post.score= upvote - downvote;
    if(post.score>0){post.score='+'+post.score}
    let a = new Date();
    a.setTime(post.date);
    post.date ="Le " + ("" + a.getDate()).padStart(2, '0') + "/" +("" + (a.getMonth()+1)).padStart(2, '0') + "/" + a.getFullYear() + " à " + ("" + a.getHours()).padStart(2, '0') + "h" + ("" + a.getMinutes()).padStart(2, '0');
  }

  res.render('user',{posts: posts, name: req.session.username, author: author});
});





////////////////////////////////////////////////////////////
///////////////        LISTEN   //////////////////////////
////////////////////////////////////////////////////////////
app.listen(port,  () => {
  console.log(`Redditeirb listening at http://localhost:${port}`)
})
