const {openDb} = require("./db");

const tablesNames = ["categories","posts","user","password","comments"];


async function createTables(db){

  const post = db.run(`
        CREATE TABLE IF NOT EXISTS posts(
          id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
          category text,
          author text,
          content text,
          date int,
          FOREIGN KEY(author) REFERENCES user(name)
        )
  `);
  const user = db.run(`
          CREATE TABLE IF NOT EXISTS user(
            id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
            name varchar(255) UNIQUE,
            mail varchar(255) UNIQUE,
            password text,
            FOREIGN KEY(password) REFERENCES passwords(id)            
          )
  `);
  const comment = db.run(`
            CREATE TABLE IF NOT EXISTS comments(
              id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
              author int,
              post_id int,
              content text,
              date int,
              FOREIGN KEY(author) REFERENCES user(id),
              FOREIGN KEY(post_id) REFERENCES posts(id)
            )
  `)
  const vote = db.run(`
              CREATE TABLE IF NOT EXISTS votes(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id int,
                comment_id int,
                type text,
                user_id int,
                FOREIGN KEY(post_id) REFERENCES posts(id),
                FOREIGN KEY(comment_id) REFERENCES comments(id),
                FOREIGN KEY(user_id) REFERENCES user(id)
              )
  `)

  return await Promise.all([post,user,comment,vote])
};


async function dropTables(db){
  return await Promise.all(tablesNames.map( tableName => {
      return db.run(`DROP TABLE IF EXISTS ${tableName}`);
    }
  ));
};

(async () => {
  // open the database
  let db = await openDb();
  await dropTables(db);
  await createTables(db);
})();
