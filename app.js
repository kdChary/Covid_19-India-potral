const express = require("express");
const path = require("path");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

let db;

const setDbAndRun = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "covid19IndiaPortal.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server running at http://localhost:3000/")
    );
  } catch (err) {
    console.log(`Db Error: ${err.message}`);
    process.exit(1);
  }
};

setDbAndRun();

const secretCode = "ccbpCoding";

// API 1 to successfully login user and generate Auth token.
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  console.log(username);

  const getUserQuery = `
      SELECT 
        *
      FROM user
      WHERE username = "${username}";
    `;
  const existingUser = await db.get(getUserQuery);

  if (existingUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isValidPassword = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (isValidPassword) {
      const payload = { username: username };
      const jwt_token = jwt.sign(payload, secretCode);

      //   response.status(200);
      response.send({ jwt_token });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
