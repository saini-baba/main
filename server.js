const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./db/user.db");
const user_route = require("./routes/user.routes");
app.use(cors());
app.use(express.json());
app.use("/user", user_route);
app.listen(3200, () => {
  console.log("running");
});
