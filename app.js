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

// Middle ware  function for authenticating user.
const authenticateRequest = async (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let token;
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
    // console.log(token);
  }

  if (token === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(token, secretCode, async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// API 1 to successfully login user and generate Auth token.
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

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

      response.send({ jwtToken: jwt_token });
      //   console.log(jwt_token);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 2 to get all the states.
app.get("/states/", authenticateRequest, async (request, response) => {
  const getAllStatesQuery = `
      SELECT 
        state_id AS stateId,
        state_name AS stateName,
        population
       FROM state;
    `;

  const allStates = await db.all(getAllStatesQuery);
  response.send(allStates);
  console.log(allStates);
});

// API 3 to get specific state details.
app.get("/states/:stateId/", authenticateRequest, async (request, response) => {
  const { stateId } = request.params;
  const getSpecificState = `
      SELECT 
        state_id AS stateId,
        state_name AS stateName,
        population
      FROM 
        state 
      WHERE 
        state_id = ${stateId};
    `;

  const stateData = await db.get(getSpecificState);
  response.send(stateData);
});

// API 4 to add a new district.
app.post("/districts/", authenticateRequest, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const createDistrictQuery = `
      INSERT INTO district
        (district_name, state_id, cases, cured, active, deaths)
      VALUES
        ("${districtName}",${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
    `;

  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

// API 5 to get a specific district.
app.get(
  "/districts/:districtId/",
  authenticateRequest,
  async (request, response) => {
    const { districtId } = request.params;

    const getDistrictQuery = `
      SELECT 
        district_id AS districtId,
        district_name AS districtName,
        state_id AS stateId,
        cases, cured, active, deaths
      FROM 
        district 
      WHERE 
        district_id = ${districtId};
    `;

    const specificDistrict = await db.get(getDistrictQuery);
    response.send(specificDistrict);
  }
);

// API 6 to delete given district by ID.
app.delete(
  "/districts/:districtId/",
  authenticateRequest,
  async (request, response) => {
    const { districtId } = request.params;

    const deleteDistrictQuery = `
      DELETE FROM district WHERE district_id = ${districtId};
    `;

    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

// API 7 to update the details of specific district by ID.
app.put("/districts/:districtId/", authenticateRequest, async (req, res) => {
  const { districtId } = req.params;
  const {
    districtName = "",
    stateId = 0,
    cases = 0,
    cured = 0,
    active = 0,
    deaths = 0,
  } = req.body;

  const updateDistrictQuery = `
      UPDATE 
        district
      SET
        district_name = "${districtName}",
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
      WHERE 
        district_id = ${districtId};
    `;

  await db.run(updateDistrictQuery);
  res.send("District Details Updated");
});

app.get("/states/:stateId/stats/", authenticateRequest, async (req, res) => {
  const { stateId } = req.params;

  const getStatsQuery = `
    SELECT 
        SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId};
    `;

  const stats = await db.get(getStatsQuery);
  res.send(stats);
});

module.exports = app;
